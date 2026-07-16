import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../services/api';
import { STAGES, ScoreBadge } from '../components/ui';

function LeadCard({ lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="card p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <Link to={`/leads/${lead._id}`} className="font-medium text-sm text-brand-600 hover:underline" onClick={(e) => e.stopPropagation()}>
        {lead.name}
      </Link>
      <p className="text-xs text-slate-500 mt-1">{lead.phone}</p>
      <div className="flex items-center justify-between mt-2">
        <ScoreBadge score={lead.aiScore} />
        <span className="text-xs text-slate-400">{lead.assignedTo?.name?.split(' ')[0]}</span>
      </div>
    </div>
  );
}

function StageColumn({ stage, leads }) {
  return (
    <div className={`flex-shrink-0 w-72 bg-slate-50 rounded-xl border-t-4 ${stage.color}`}>
      <div className="p-3 border-b border-slate-200">
        <h3 className="font-medium text-sm">{stage.label}</h3>
        <span className="text-xs text-slate-500">{leads.length} leads</span>
      </div>
      <SortableContext items={leads.map((l) => l._id)} strategy={verticalListSortingStrategy}>
        <div className="p-3 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto">
          {leads.map((lead) => (
            <LeadCard key={lead._id} lead={lead} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function Pipeline() {
  const [pipeline, setPipeline] = useState({});
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadPipeline = () => api.get('/leads/pipeline').then((res) => setPipeline(res.data));

  useEffect(() => { loadPipeline(); }, []);

  const findStage = (leadId) => {
    for (const stage of STAGES) {
      if (pipeline[stage.key]?.find((l) => l._id === leadId)) return stage.key;
    }
    return null;
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const leadId = active.id;
    const fromStage = findStage(leadId);
    let toStage = over.id;

    if (!STAGES.find((s) => s.key === toStage)) {
      toStage = findStage(over.id);
    }

    if (!toStage || fromStage === toStage) return;

    setPipeline((prev) => {
      const next = { ...prev };
      const lead = next[fromStage]?.find((l) => l._id === leadId);
      if (!lead) return prev;
      next[fromStage] = next[fromStage].filter((l) => l._id !== leadId);
      next[toStage] = [...(next[toStage] || []), { ...lead, status: toStage }];
      return next;
    });

    await api.patch(`/leads/${leadId}/status`, { status: toStage });
  };

  const activeLead = activeId
    ? STAGES.flatMap((s) => pipeline[s.key] || []).find((l) => l._id === activeId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Sales Pipeline</h1>
        <p className="text-slate-500 text-sm mt-1">Drag leads between stages</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div key={stage.key} id={stage.key}>
              <StageColumn stage={stage} leads={pipeline[stage.key] || []} />
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeLead ? (
            <div className="card p-3 shadow-xl w-72">
              <p className="font-medium">{activeLead.name}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
