import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Plus, Save, Trash2, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react';
import apiService from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'react-toastify';

const ListEditor: React.FC<{
  title: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder: string;
}> = ({ title, values, onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (values.includes(v)) return;
    onChange([...values, v]);
    setInput('');
  };
  const remove = (v: string) => onChange(values.filter(x => x !== v));
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="card-content space-y-4">
        <div className="flex gap-2">
          <input className="input flex-1" placeholder={placeholder} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
          <button className="btn btn-primary pr-4" onClick={add}><Plus className="h-4 w-8" />Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {values.map(v => (
            <span key={v} className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm">
              {v}
              <button className="ml-2 text-gray-600 dark:text-gray-300 hover:text-red-600" onClick={() => remove(v)}><Trash2 className="h-4 w-4" /></button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

interface LeadStage {
  label: string;
  subStages: string[];
}

const LeadStagesEditor: React.FC<{
  leadStages: LeadStage[];
  onChange: (stages: LeadStage[]) => void;
}> = ({ leadStages, onChange }) => {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [editingStageOriginalLabel, setEditingStageOriginalLabel] = useState<string | null>(null);
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newSubStage, setNewSubStage] = useState<{ [key: string]: string }>({});

  const toggleExpand = (label: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedStages(newExpanded);
  };

  const addStage = () => {
    if (!newStageLabel.trim()) {
      toast.error('Please enter a lead stage name');
      return;
    }
    if (leadStages.some(s => s.label === newStageLabel.trim())) {
      toast.error('Lead stage with this name already exists');
      return;
    }
    onChange([...leadStages, { label: newStageLabel.trim(), subStages: [] }]);
    setNewStageLabel('');
  };

  const updateStage = (oldLabel: string, newLabel: string, currentIndex: number) => {
    if (!newLabel.trim()) {
      toast.error('Lead stage name cannot be empty');
      return;
    }
    // Check if another stage (not the current one being edited) has the same label
    if (newLabel.trim() !== oldLabel && leadStages.some((s, idx) => idx !== currentIndex && s.label === newLabel.trim())) {
      toast.error('Lead stage with this name already exists');
      return;
    }
    onChange(leadStages.map(s => s.label === oldLabel ? { ...s, label: newLabel.trim() } : s));
    setEditingStageIndex(null);
    setEditingStageOriginalLabel(null);
  };

  const deleteStage = (label: string) => {
    if (confirm('Are you sure you want to delete this lead stage?')) {
      onChange(leadStages.filter(s => s.label !== label));
    }
  };

  const addSubStage = (stageLabel: string) => {
    const subStageValue = newSubStage[stageLabel]?.trim();
    if (!subStageValue) return;
    const stage = leadStages.find(s => s.label === stageLabel);
    if (stage && stage.subStages.includes(subStageValue)) {
      toast.error('This sub-stage already exists');
      return;
    }
    onChange(leadStages.map(s => 
      s.label === stageLabel 
        ? { ...s, subStages: [...s.subStages, subStageValue] }
        : s
    ));
    setNewSubStage({ ...newSubStage, [stageLabel]: '' });
  };

  const removeSubStage = (stageLabel: string, subStage: string) => {
    onChange(leadStages.map(s => 
      s.label === stageLabel 
        ? { ...s, subStages: s.subStages.filter(sub => sub !== subStage) }
        : s
    ));
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold">Lead Stages & Sub-Stages</h2>
      </div>
      <div className="card-content space-y-4">
        {/* Add New Stage */}
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Lead Stage (e.g., Cold)"
            value={newStageLabel}
            onChange={(e) => setNewStageLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addStage(); }}
          />
          <button className="btn btn-primary p-2" onClick={addStage}>
            <Plus className="h-4 w-4 mr-1" />Add Stage
          </button>
        </div>

        {/* Existing Stages */}
        <div className="space-y-3">
          {leadStages.map((stage, index) => {
            // Check if this stage is being edited by comparing the index
            const isEditing = editingStageIndex === index;
            const originalLabel = editingStageOriginalLabel || stage.label;
            
            return (
              <div key={`${stage.label}-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    {isEditing ? (
                      <>
                        <input
                          className="input text-sm flex-1"
                          value={stage.label}
                          onChange={(e) => {
                            const newStages = leadStages.map((s, idx) => 
                              idx === index ? { ...s, label: e.target.value } : s
                            );
                            onChange(newStages);
                          }}
                          placeholder="Lead Stage"
                          autoFocus
                        />
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            updateStage(originalLabel, stage.label, index);
                          }}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            setEditingStageIndex(null);
                            setEditingStageOriginalLabel(null);
                            // Restore original label if canceled
                            if (stage.label !== originalLabel) {
                              const restoredStages = leadStages.map((s, idx) => 
                                idx === index ? { ...s, label: originalLabel } : s
                              );
                              onChange(restoredStages);
                            }
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stage.label}
                        </span>
                        <button
                          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded px-2 py-1 transition-colors"
                          onClick={() => {
                            setEditingStageIndex(index);
                            setEditingStageOriginalLabel(stage.label);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => toggleExpand(stage.label)}
                    >
                      {expandedStages.has(stage.label) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      className="btn btn-sm btn-ghost text-red-600 hover:text-red-700"
                      onClick={() => deleteStage(stage.label)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-Stages */}
                {expandedStages.has(stage.label) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex gap-2">
                      <input
                        className="input text-sm flex-1"
                        placeholder="Add sub-stage"
                        value={newSubStage[stage.label] || ''}
                        onChange={(e) => setNewSubStage({ ...newSubStage, [stage.label]: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') addSubStage(stage.label); }}
                      />
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => addSubStage(stage.label)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stage.subStages.map((subStage) => (
                        <span
                          key={subStage}
                          className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm"
                        >
                          {subStage}
                          <button
                            className="ml-2 text-gray-600 dark:text-gray-300 hover:text-red-600"
                            onClick={() => removeSubStage(stage.label, subStage)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ManageOptions: React.FC = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [leadStages, setLeadStages] = useState<LeadStage[]>([]);

  // Use useQuery to fetch options and automatically refetch when cache is invalidated
  const { isLoading: loading } = useQuery(
    'options',
    () => apiService.options.get(),
    {
      staleTime: 0, // Always consider data stale to ensure fresh data
      cacheTime: 0, // Don't cache to ensure fresh data
      onSuccess: (res) => {
        const d = res.data || {};
        setCourses(d.courses || []);
        setLocations(d.locations || []);
        setStatuses(d.statuses || []);
        setLeadStages(d.leadStages || []);
      }
    }
  );

  const saveAll = async () => {
    try {
      setSaving(true);
      const response = await apiService.options.update({ 
        courses, 
        locations, 
        statuses, 
        leadStages: leadStages as Array<{ label: string; subStages: string[] }>
      });
      // Update local state with the response data to ensure consistency
      if (response?.data) {
        setCourses(response.data.courses || []);
        setLocations(response.data.locations || []);
        setStatuses(response.data.statuses || []);
        setLeadStages(response.data.leadStages || []);
      }
      // Invalidate the options query cache so all components using it will refetch
      queryClient.invalidateQueries(['options']);
      toast.success('Changes Saved');
    } catch (error: any) {
      console.error('Error saving options:', error);
      toast.error(error?.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Options</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Admin can configure Courses, Locations, Inquiry Statuses, and Lead Stages</p>
        </div>
        <button className="btn btn-primary btn-lg px-6" onClick={saveAll} disabled={saving}><Save className="h-5 w-5 mr-2" />{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ListEditor title="Courses" values={courses} onChange={setCourses} placeholder="Add course" />
        <ListEditor title="Locations" values={locations} onChange={setLocations} placeholder="Add location" />
        <ListEditor title="Statuses" values={statuses} onChange={setStatuses} placeholder="Add status e.g. hot" />
      </div>

      <div className="mt-6">
        <LeadStagesEditor leadStages={leadStages} onChange={setLeadStages} />
      </div>
    </div>
  );
};

export default ManageOptions;


