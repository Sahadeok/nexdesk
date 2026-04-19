'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getCurrentUserProfile } from '../../../lib/supabase'
import { useTenant } from '../../../lib/tenant-context'
import GlobalNav from '../../components/GlobalNav'

export default function UserDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { tenant } = useTenant()

  const [profile, setProfile] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'medium' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const brandColor = tenant?.brand_primary_color || '#2563eb'

  useEffect(() => { init() }, [])

  async function init() {
    const { user, profile: p } = await getCurrentUserProfile(supabase)
    if (!user) { router.replace('/login'); return }
    setProfile(p)
    await loadTickets(p.tenant_id)
    setLoading(false)
  }

  async function loadTickets(tenantId) {
    if (!tenantId) return
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    setTickets(data || [])
  }

  async function createTicket(e) {
    e.preventDefault()
    if (!newTicket.title || !profile?.tenant_id) return

    setSubmitting(true)
    const { error } = await supabase.from('tickets').insert({
      title: newTicket.title,
      description: newTicket.description,
      priority: newTicket.priority,
      status: 'open',
      created_by: profile.id,
      tenant_id: profile.tenant_id,
      ticket_number: `TKT-${Date.now()}`
    })

    if (error) {
      setMessage('❌ Failed to create ticket: ' + error.message)
    } else {
      setMessage('✅ Ticket created successfully!')
      setNewTicket({ title: '', description: '', priority: 'medium' })
      setShowNewTicket(false)
      await loadTickets(profile.tenant_id)
    }
    setSubmitting(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: 'DM Sans, sans-serif' }}>
      <GlobalNav title="My Support Workspace" />
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .skeleton {
          background: #111827;
          background-image: linear-gradient(to right, #111827 4%, #1f2937 25%, #111827 36%);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite linear;
          border-radius: 12px;
        }
      `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32 }}>
        <div className="skeleton" style={{ height: 32, width: 300, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 20, width: 200, marginBottom: 32 }} />
        <div className="grid-cols-4" style={{ marginBottom: 32 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
        <div className="skeleton" style={{ height: 400, width: '100%' }} />
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: 'DM Sans, sans-serif' }}>
      <GlobalNav title="My Support Workspace" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32 }}>
        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Welcome, {profile?.full_name || 'User'} 👋</h1>
          <p style={{ color: '#64748b' }}>Submit and track your IT support tickets</p>
        </div>

        {/* Stats */}
        <div className="grid-cols-4" style={{ marginBottom: 32 }}>
          {[
            { label: 'Total Tickets', value: tickets.length, icon: '🎫', color: '#60a5fa' },
            { label: 'Open', value: tickets.filter(t => t.status === 'open').length, icon: '📂', color: '#f59e0b' },
            { label: 'In Progress', value: tickets.filter(t => t.status === 'in_progress').length, icon: '⏳', color: '#a78bfa' },
            { label: 'Resolved', value: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length, icon: '✅', color: '#34d399' }
          ].map((stat, i) => (
            <div key={i} style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div style={{ padding: '12px 16px', background: message.startsWith('✅') ? '#022c22' : '#1c0000', border: `1px solid ${message.startsWith('✅') ? '#10b98140' : '#ef444440'}`, borderRadius: 8, color: message.startsWith('✅') ? '#34d399' : '#fca5a5', marginBottom: 16 }}>
            {message}
          </div>
        )}

        {/* New Ticket Button */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setShowNewTicket(!showNewTicket)}
            style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            {showNewTicket ? '✕ Cancel' : '+ Create New Ticket'}
          </button>
        </div>

        {/* New Ticket Form */}
        {showNewTicket && (
          <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 12, padding: 24, marginBottom: 32 }}>
            <h3 style={{ marginBottom: 16 }}>Create New Ticket</h3>
            <form onSubmit={createTicket}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 8 }}>Title *</label>
                <input
                  type="text"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                  placeholder="Brief description of the issue"
                  style={{ width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #1f2d45', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 8 }}>Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Detailed description of the issue..."
                  rows={4}
                  style={{ width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #1f2d45', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 8 }}>Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                  style={{ padding: '10px 16px', background: '#0f172a', border: '1px solid #1f2d45', borderRadius: 8, color: '#e2e8f0', fontSize: 14 }}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', borderRadius: 8, color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Creating...' : 'Create Ticket'}
              </button>
            </form>
          </div>
        )}

        {/* Tickets List */}
        <div style={{ background: '#111827', border: '1px solid #1f2d45', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f2d45', fontSize: 16, fontWeight: 600 }}>
            My Tickets ({tickets.length})
          </div>
          {tickets.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎫</div>
              <p>No tickets yet. Create your first ticket above!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0e1a' }}>
                    {['Ticket #', 'Title', 'Status', 'Priority', 'Created', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id} style={{ borderBottom: '1px solid #1f2d45' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace' }}>{ticket.ticket_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{ticket.title}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: STATUS_COLORS[ticket.status]?.bg || '#1f2937', color: STATUS_COLORS[ticket.status]?.color || '#64748b' }}>
                          {ticket.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: PRIORITY_COLORS[ticket.priority]?.bg || '#1f2937', color: PRIORITY_COLORS[ticket.priority]?.color || '#64748b' }}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button style={{ padding: '6px 12px', background: '#1e3a5f', border: '1px solid #3b82f640', borderRadius: 6, color: '#60a5fa', cursor: 'pointer', fontSize: 12 }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

