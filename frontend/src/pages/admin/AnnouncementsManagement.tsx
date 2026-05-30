// src/pages/AnnouncementManagement.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Plus, X, Edit, Trash2, Send, Calendar, AlertCircle, CheckCircle, Clock, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useSettings } from '../../lib/SettingsContext';
import AdminSidebar from '../../components/AdminSidebar';
import '../../styles/adminStyling/Dashboard.css';
import '../../styles/adminStyling/AnnouncementManagement.css';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'published' | 'archived';
  priority: 'low' | 'medium' | 'high';
  expires_at?: string | null;
  image?: string | null;
  created_by_name?: string | null;
}

interface AnnouncementPayload {
  title: string;
  description: string;
  content: string;
  priority: string;
  status: string;
  image?: string;
}

export default function AnnouncementManagement() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [isAnimating, setIsAnimating] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    status: 'draft' | 'published' | 'archived';
    image: string;
  }>({
    title: '',
    description: '',
    content: '',
    priority: 'medium',
    status: 'draft',
    image: '',
  });

  // Fetch announcements on mount and initialize user
  useEffect(() => {
    fetchAnnouncements();
    initUser();
    
    const goOnline = () => setIsBrowserOnline(true);
    const goOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Mouse move for 3D parallax effects
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const initUser = async () => {
    try {
      const me = await api.get<{ id: string; full_name?: string; email: string }>('/users/me');
      setUser({
        id: me.id,
        name: me.full_name || me.email?.split('@')[0] || 'User',
        email: me.email || '',
      });
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setIsAnimating(true);
      const data = await api.get<Announcement[]>('/announcements/');
      setAnnouncements(data);
      setTimeout(() => setIsAnimating(false), 300);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
      setMessage('Failed to load announcements');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setMessage('Title and description are required');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);

      const payload: AnnouncementPayload = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        priority: formData.priority,
        status: formData.status,
        image: formData.image || undefined,
      };

      if (editingId) {
        await api.put<Announcement>(`/announcements/${editingId}`, payload);
        setMessage('Announcement updated successfully');
        setMessageType('success');
      } else {
        await api.post<Announcement>('/announcements/', payload);
        setMessage('Announcement created successfully');
        setMessageType('success');
      }

      // Reset form and reload
      setFormData({
        title: '',
        description: '',
        content: '',
        priority: 'medium',
        status: 'draft',
        image: '',
      });
      setEditingId(null);
      setShowForm(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      setMessage('Error saving announcement');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      description: announcement.description,
      content: announcement.content,
      priority: announcement.priority,
      status: announcement.status,
      image: announcement.image || '',
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        setLoading(true);
        await api.delete(`/announcements/${id}`);
        setMessage('Announcement deleted successfully');
        setMessageType('success');
        fetchAnnouncements();
      } catch (error) {
        console.error('Error deleting announcement:', error);
        setMessage('Error deleting announcement');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePublish = async (id: string) => {
    try {
      setLoading(true);
      await api.patch<Announcement>(`/announcements/${id}/publish`);
      setMessage('Announcement published successfully');
      setMessageType('success');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error publishing announcement:', error);
      setMessage('Error publishing announcement');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#ef4444' };
      case 'medium': return { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#f59e0b' };
      case 'low': return { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#22c55e' };
      default: return { bg: 'rgba(107, 114, 128, 0.1)', border: '#6b7280', text: '#6b7280' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#22c55e' };
      case 'draft': return { bg: 'rgba(107, 114, 128, 0.1)', border: '#6b7280', text: '#6b7280' };
      case 'archived': return { bg: 'rgba(156, 163, 175, 0.1)', border: '#9ca3af', text: '#9ca3af' };
      default: return { bg: 'rgba(107, 114, 128, 0.1)', border: '#6b7280', text: '#6b7280' };
    }
  };

  return (
    <div className="dash-wrapper">
      <AdminSidebar />
      <main className="dash-main">
        <div className="dash-content announcement-management">
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', transformStyle: 'preserve-3d' }}>
        {/* Header with 3D effect */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          animation: 'slideIn 0.6s ease-out both',
          transform: `translateZ(50px) rotateX(${-mousePosition.y * 0.2}deg) rotateY(${-mousePosition.x * 0.2}deg)`,
          transition: 'transform 0.3s ease-out'
        }}>
          <div>
            <h1 style={{
              color: '#fff',
              fontSize: '2rem',
              fontWeight: '700',
              margin: 0,
              background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Announcement Management
            </h1>
            <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
              Create and manage company announcements
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                title: '',
                description: '',
                content: '',
                priority: 'medium',
                status: 'draft',
                image: '',
              });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1.5rem',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
              transform: 'translateZ(30px)',
              transformStyle: 'preserve-3d'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) translateZ(40px) rotateX(5deg)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) translateZ(30px) rotateX(0deg)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.4)';
            }}
          >
            <Plus size={20} style={{ transform: 'translateZ(10px)' }} />
            {showForm ? 'Cancel' : 'New Announcement'}
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: messageType === 'success' ? 'rgba(34, 197, 94, 0.1)' : 
                      messageType === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                      'rgba(59, 130, 246, 0.1)',
            border: `1px solid ${messageType === 'success' ? '#22c55e' : 
                              messageType === 'error' ? '#ef4444' : 
                              '#3b82f6'}`,
            color: messageType === 'success' ? '#22c55e' : 
                   messageType === 'error' ? '#ef4444' : 
                   '#3b82f6',
            animation: 'slideIn 0.4s ease-out'
          }}>
            {messageType === 'success' && <CheckCircle size={20} />}
            {messageType === 'error' && <AlertCircle size={20} />}
            {messageType === 'info' && <Clock size={20} />}
            <span style={{ flex: 1, fontWeight: '500' }}>{message}</span>
            <button
              onClick={() => setMessage('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Form with 3D effect */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              animation: 'fadeIn 0.5s ease-out',
              transform: 'translateZ(30px)',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.3s ease-out'
            }}
          >
            <h2 style={{
              color: '#fff',
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0 0 1.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transform: 'translateZ(20px)'
            }}>
              <Sparkles size={24} style={{ color: '#8b5cf6', transform: 'translateZ(10px)', animation: 'rotate3D 4s ease-in-out infinite' }} />
              {editingId ? 'Edit Announcement' : 'Create New Announcement'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', transformStyle: 'preserve-3d' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', transform: 'translateZ(10px)' }}>
                <label style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: '600' }}>
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter announcement title"
                  required
                  style={{
                    padding: '0.875rem 1rem',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    transform: 'translateZ(5px)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#8b5cf6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    e.currentTarget.style.transform = 'translateZ(10px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateZ(5px)';
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', transform: 'translateZ(10px)' }}>
                <label style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: '600' }}>
                  Description *
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description for notifications"
                  required
                  style={{
                    padding: '0.875rem 1rem',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    transform: 'translateZ(5px)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#8b5cf6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    e.currentTarget.style.transform = 'translateZ(10px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateZ(5px)';
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', transform: 'translateZ(10px)' }}>
              <label style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: '600' }}>
                Full Content
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Detailed announcement content..."
                rows={5}
                style={{
                  padding: '0.875rem 1rem',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  transform: 'translateZ(5px)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8b5cf6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                  e.currentTarget.style.transform = 'translateZ(10px)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateZ(5px)';
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', transformStyle: 'preserve-3d' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', transform: 'translateZ(10px)' }}>
                <label style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: '600' }}>
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.875rem 1rem',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: 'translateZ(5px)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#8b5cf6';
                    e.currentTarget.style.transform = 'translateZ(10px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    e.currentTarget.style.transform = 'translateZ(5px)';
                  }}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', transform: 'translateZ(10px)' }}>
                <label style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: '600' }}>
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  style={{
                    padding: '0.875rem 1rem',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: 'translateZ(5px)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#8b5cf6';
                    e.currentTarget.style.transform = 'translateZ(10px)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    e.currentTarget.style.transform = 'translateZ(5px)';
                  }}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', transform: 'translateZ(10px)' }}>
              <label style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: '600' }}>
                Image
              </label>
              <div style={{
                position: 'relative',
                border: '2px dashed rgba(139, 92, 246, 0.3)',
                borderRadius: '10px',
                padding: '2rem',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                transform: 'translateZ(5px)',
                transformStyle: 'preserve-3d'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
                e.currentTarget.style.transform = 'translateZ(10px) rotateX(5deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateZ(5px) rotateX(0deg)';
              }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <ImageIcon size={32} style={{ color: '#8b5cf6', marginBottom: '0.5rem', transform: 'translateZ(10px)' }} />
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem', transform: 'translateZ(5px)' }}>
                  {formData.image ? 'Change image' : 'Click to upload image'}
                </p>
              </div>
              {formData.image && (
                <div style={{ marginTop: '1rem', position: 'relative', transform: 'translateZ(15px)' }}>
                  <img
                    src={formData.image}
                    alt="Preview"
                    style={{
                      width: '100%',
                      maxHeight: '200px',
                      objectFit: 'cover',
                      borderRadius: '10px',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      transform: 'translateZ(5px)',
                      transition: 'transform 0.3s ease'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: '' })}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.9)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      color: '#fff',
                      transform: 'translateZ(20px)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateZ(25px) scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateZ(20px) scale(1)';
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', transformStyle: 'preserve-3d' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '0.875rem 2rem',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'translateZ(20px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                  e.currentTarget.style.transform = 'translateZ(25px) rotateX(5deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                  e.currentTarget.style.transform = 'translateZ(20px) rotateX(0deg)';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.875rem 2rem',
                  background: loading ? 'rgba(139, 92, 246, 0.5)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(139, 92, 246, 0.4)',
                  transform: 'translateZ(30px)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateZ(40px) translateY(-4px) rotateX(5deg)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateZ(30px) translateY(0) rotateX(0deg)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.4)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #fff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <span style={{ transform: 'translateZ(5px)' }}>{editingId ? <Edit size={18} /> : <Send size={18} />}</span>
                    <span style={{ transform: 'translateZ(5px)' }}>{editingId ? 'Update' : 'Create'} Announcement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Announcements List */}
        <div style={{ animation: 'slideIn 0.6s ease-out 0.2s both' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              color: '#fff',
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: 0
            }}>
              All Announcements ({announcements.length})
            </h2>
          </div>

          {loading && !showForm ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem',
              color: '#94a3b8'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(139, 92, 246, 0.3)',
                borderTop: '3px solid #8b5cf6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }}></div>
              <p>Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '20px',
              border: '1px dashed rgba(139, 92, 246, 0.3)'
            }}>
              <Megaphone size={64} style={{ color: '#8b5cf6', marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                No announcements yet
              </p>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                Create your first announcement to get started
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {announcements.map((announcement, index) => {
                const priorityColors = getPriorityColor(announcement.priority);
                const statusColors = getStatusColor(announcement.status);
                
                return (
                  <div
                    key={announcement.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '16px',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                      cursor: 'pointer',
                      transformStyle: 'preserve-3d',
                      transform: `translateZ(${20 + index * 5}px) rotateX(${-mousePosition.y * 0.1}deg) rotateY(${mousePosition.x * 0.1}deg)`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px) translateZ(60px) rotateX(5deg) rotateY(-5deg)';
                      e.currentTarget.style.boxShadow = '0 20px 60px rgba(139, 92, 246, 0.4)';
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = `translateZ(${20 + index * 5}px) rotateX(${-mousePosition.y * 0.1}deg) rotateY(${mousePosition.x * 0.1}deg)`;
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
                    }}
                  >
                    {announcement.image && (
                      <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                        <img
                          src={announcement.image}
                          alt={announcement.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: priorityColors.bg,
                          border: `1px solid ${priorityColors.border}`,
                          color: priorityColors.text
                        }}>
                          {announcement.priority}
                        </div>
                      </div>
                    )}
                    
                    <div style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <h3 style={{
                          color: '#fff',
                          fontSize: '1.125rem',
                          fontWeight: '700',
                          margin: 0,
                          flex: 1,
                          lineHeight: '1.4'
                        }}>
                          {announcement.title}
                        </h3>
                        {!announcement.image && (
                          <span style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            background: priorityColors.bg,
                            border: `1px solid ${priorityColors.border}`,
                            color: priorityColors.text,
                            marginLeft: '0.75rem'
                          }}>
                            {announcement.priority}
                          </span>
                        )}
                      </div>

                      <p style={{
                        color: '#94a3b8',
                        fontSize: '0.875rem',
                        margin: '0 0 1rem 0',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {announcement.description}
                      </p>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '1rem',
                        fontSize: '0.8125rem',
                        color: '#64748b'
                      }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.375rem 0.75rem',
                          borderRadius: '8px',
                          background: statusColors.bg,
                          border: `1px solid ${statusColors.border}`,
                          color: statusColors.text,
                          fontWeight: '600'
                        }}>
                          {announcement.status}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Calendar size={14} />
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        borderTop: '1px solid rgba(139, 92, 246, 0.2)',
                        paddingTop: '1rem',
                        transformStyle: 'preserve-3d'
                      }}>
                        {announcement.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(announcement.id)}
                            disabled={loading}
                            style={{
                              flex: 1,
                              padding: '0.625rem 1rem',
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid #22c55e',
                              borderRadius: '8px',
                              color: '#22c55e',
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.375rem',
                              transform: 'translateZ(10px)'
                            }}
                            onMouseEnter={(e) => {
                              if (!loading) {
                                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                                e.currentTarget.style.transform = 'translateZ(15px) translateY(-2px) rotateX(5deg)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                              e.currentTarget.style.transform = 'translateZ(10px) translateY(0) rotateX(0deg)';
                            }}
                          >
                            <Send size={14} style={{ transform: 'translateZ(5px)' }} />
                            <span style={{ transform: 'translateZ(5px)' }}>Publish</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(announcement)}
                          style={{
                            flex: 1,
                            padding: '0.625rem 1rem',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid #f59e0b',
                            borderRadius: '8px',
                            color: '#f59e0b',
                            fontSize: '0.8125rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                            transform: 'translateZ(10px)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
                            e.currentTarget.style.transform = 'translateZ(15px) translateY(-2px) rotateX(5deg)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                            e.currentTarget.style.transform = 'translateZ(10px) translateY(0) rotateX(0deg)';
                          }}
                        >
                          <Edit size={14} style={{ transform: 'translateZ(5px)' }} />
                          <span style={{ transform: 'translateZ(5px)' }}>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          disabled={loading}
                          style={{
                            flex: 1,
                            padding: '0.625rem 1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            color: '#ef4444',
                            fontSize: '0.8125rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                            transform: 'translateZ(10px)'
                          }}
                          onMouseEnter={(e) => {
                            if (!loading) {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                              e.currentTarget.style.transform = 'translateZ(15px) translateY(-2px) rotateX(5deg)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.transform = 'translateZ(10px) translateY(0) rotateX(0deg)';
                          }}
                        >
                          <Trash2 size={14} style={{ transform: 'translateZ(5px)' }} />
                          <span style={{ transform: 'translateZ(5px)' }}>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
        </div>
      </main>
    </div>
  );
}