"use client";
import { useState, useEffect, use } from 'react';
import { createClient } from '../../../../lib/supabase';
import TopBar from '../../../components/TopBar';

export default function PostmortemDetail({ params }) {
  const unwrappedParams = use(params);
  const [pm, setPm] = useState(null);
  const [causes, setCauses] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchPM();
  }, [unwrappedParams.id]);

  async function fetchPM() {
    setLoading(true);
    const { data: pmData } = await supabase
      .from('postmortems')
      .select('*')
      .eq('id', unwrappedParams.id)
      .single();
    
    if (pmData) {
      setPm(pmData);
      
      const { data: rcData } = await supabase
        .from('postmortem_root_causes')
        .select('*')
        .eq('postmortem_id', pmData.id);
      if (rcData) setCauses(rcData);

      const { data: actionData } = await supabase
        .from('postmortem_action_items')
        .select('*')
        .eq('postmortem_id', pmData.id);
      if (actionData) setActions(actionData);
    }
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-white min-h-screen bg-gray-900">Loading...</div>;
  if (!pm) return <div className="p-8 text-white min-h-screen bg-gray-900">Postmortem not found.</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TopBar title="Postmortem Details" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="bg-blue-900 text-blue-300 font-bold px-3 py-1 rounded text-sm">{pm.pm_number}</span>
            <span className="uppercase text-xs tracking-wider text-gray-400 font-semibold bg-gray-700 px-2 py-1 rounded">{pm.incident_type}</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">{pm.title}</h1>
          <p className="text-gray-400 text-sm">Created: {new Date(pm.created_at).toLocaleString()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            <Section title="Executive Brief" content={pm.ai_executive_brief} />
            <Section title="Narrative Story" content={pm.ai_narrative_story} />
            <Section title="Technical Deep Dive" content={pm.ai_technical_deepdive} />
            <Section title="Lessons Learned" content={pm.ai_lessons_learned} />
            <Section title="Prevention Plan" content={pm.ai_prevention_plan} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Root Causes */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
                <span>🔍</span> Root Causes
              </h3>
              {causes.length === 0 ? <p className="text-sm text-gray-500">No root causes identified</p> : (
                <ul className="space-y-4">
                  {causes.map(c => (
                    <li key={c.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                      <div className="text-[10px] text-blue-400 mb-1 font-bold uppercase tracking-wider">{c.level_label}</div>
                      <div className="font-bold text-sm mb-2">{c.title}</div>
                      <p className="text-xs text-gray-400">{c.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Action Items */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
                <span>📋</span> Action Items
              </h3>
              {actions.length === 0 ? <p className="text-sm text-gray-500">No action items</p> : (
                <ul className="space-y-4">
                  {actions.map(a => (
                    <li key={a.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                      <div className="flex justify-between text-[10px] mb-2 font-bold tracking-wider">
                        <span className="text-purple-400 uppercase">{a.action_type}</span>
                        <span className={`uppercase ${a.priority?.toLowerCase() === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>{a.priority}</span>
                      </div>
                      <div className="font-bold text-sm mb-2 text-white">{a.title}</div>
                      <p className="text-xs text-gray-400 mb-3 leading-relaxed">{a.description}</p>
                      <div className="text-xs text-gray-500 flex justify-between bg-gray-800 px-3 py-2 rounded-md">
                        <span className="font-medium text-gray-300">👨‍💻 {a.owner}</span>
                        <span className="font-medium text-gray-300">⏱️ {a.deadline}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

function Section({ title, content }) {
  if (!content) return null;
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-700 flex items-center gap-2 text-gray-100">
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        {title}
      </h2>
      <div className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm pt-2">
        {content}
      </div>
    </div>
  );
}
