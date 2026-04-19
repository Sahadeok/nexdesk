"use client";
import { useState, useEffect } from 'react';
import { createClient } from '../../../lib/supabase';
import TopBar from '../../components/TopBar';

export default function PostmortemsDashboard() {
  const [postmortems, setPostmortems] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchPostmortems();
  }, []);

  async function fetchPostmortems() {
    setLoading(true);
    const { data } = await supabase
      .from('postmortems')
      .select('*, tickets:incident_ticket_id(ticket_number)')
      .order('created_at', { ascending: false });
    
    if (data) setPostmortems(data);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TopBar title="AI Postmortem Intelligence" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Incident Postmortems</h1>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading postmortems...</div>
        ) : postmortems?.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
            <h3 className="text-xl font-semibold mb-2">No Postmortems Found</h3>
            <p className="text-gray-400">Postmortems will appear here once generated from resolved incidents.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postmortems?.map(pm => (
              <a key={pm.id} href={`/dashboard/postmortems/${pm.id}`} className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-blue-500 transition-colors block">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-blue-400 bg-blue-900/30 px-2 py-1 rounded">{pm.pm_number}</span>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${pm.status === 'published' ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-500'}`}>
                    {pm.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2 line-clamp-2">{pm.title}</h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                  {pm.ai_executive_brief || 'No summary available.'}
                </p>
                <div className="pt-4 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
                  <span>Source: {pm.tickets?.ticket_number || 'Unknown'}</span>
                  <span>{new Date(pm.created_at).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

