import stripe
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.config.settings import settings
from src.models.models import Payment, Invoice

if settings.STRIPE_API_KEY:
    stripe.api_key = settings.STRIPE_API_KEY

class PaymentService:
    def create_checkout_session(self, db: Session, *, invoice_id: UUID, tenant_id: UUID):
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == tenant_id
        ).first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": "usd",
                            "product_data": {
                                "name": f"Invoice {invoice.number}",
                            },
                            "unit_amount": int(invoice.amount * 100), # Stripe uses cents
                        },
                        "quantity": 1,
                    },
                ],
                mode="payment",
                success_url=f"{settings.FRONTEND_URL}/payments/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/payments/cancel",
                metadata={
                    "invoice_id": str(invoice.id),
                    "tenant_id": str(tenant_id)
                }
            )
            return checkout_session
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def handle_webhook_event(self, db: Session, event_data: dict):
        event_type = event_data.get("type")
        
        if event_type == "checkout.session.completed":
            session = event_data["data"]["object"]
            self._process_successful_payment(db, session)
        
        return {"status": "success"}

    def _process_successful_payment(self, db: Session, session: dict):
        invoice_id = session.get("metadata", {}).get("invoice_id")
        tenant_id = session.get("metadata", {}).get("tenant_id")
        
        if not invoice_id or not tenant_id:
            return

        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return

        # Create payment record
        payment = Payment(
            invoice_id=invoice.id,
            tenant_id=invoice.tenant_id,
            amount=invoice.amount,
            payment_method="stripe",
            status="completed"
        )
        db.add(payment)
        
        # Update invoice status
        invoice.status = "paid"
        
        db.commit()

payment_service = PaymentService()
