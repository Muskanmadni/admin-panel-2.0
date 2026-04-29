import stripe
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session

from src.api import deps
from src.config.settings import settings
from src.services.payment import payment_service
from src.models.models import User

router = APIRouter()

@router.post("/create-checkout-session")
def create_checkout_session(
    invoice_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Create a Stripe Checkout Session for an invoice.
    """
    return payment_service.create_checkout_session(
        db, 
        invoice_id=invoice_id, 
        tenant_id=current_user.tenant_id
    )

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: Session = Depends(deps.get_db)
):
    """
    Stripe webhook handler.
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    return payment_service.handle_webhook_event(db, event)
