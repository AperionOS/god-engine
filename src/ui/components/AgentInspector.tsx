import { Agent, AgentState } from '../../engine/agent';
import { Activity, Brain, Utensils, Zap, Dna } from 'lucide-react';

interface AgentInspectorProps {
  agent: Agent;
}

export function AgentInspector({ agent }: AgentInspectorProps) {
  const getProgressColor = (value: number, max: number) => {
    const pct = value / max;
    if (pct < 0.3) return 'bg-red-500';
    if (pct < 0.6) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
        <div className="h-10 w-10 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-lg">
          {agent.id}
        </div>
        <div>
          <h2 className="font-bold text-lg">Agent #{agent.id}</h2>
          <p className="text-xs text-gray-400 font-mono">
            {agent.x.toFixed(1)}, {agent.y.toFixed(1)}
          </p>
        </div>
      </div>

      {/* State */}
      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center gap-2 mb-2 text-gray-400">
          <Brain size={16} />
          <span className="text-sm">Current State</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            agent.state === AgentState.IDLE ? 'bg-white' :
            agent.state === AgentState.FORAGING ? 'bg-blue-500' :
            agent.state === AgentState.EATING ? 'bg-green-500' :
            'bg-orange-500'
          }`} />
          <span className="font-bold text-lg">{agent.state}</span>
        </div>
      </div>

      {/* Vitals */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vitals</h3>
        
        {/* Hunger */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1"><Utensils size={12}/> Hunger</span>
            <span>{Math.round(agent.hunger)}/{agent.maxHunger}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${getProgressColor(agent.maxHunger - agent.hunger, agent.maxHunger)}`}
              style={{ width: `${Math.max(0, 100 - (agent.hunger / agent.maxHunger * 100))}%` }}
            />
          </div>
        </div>

        {/* Energy */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1"><Zap size={12}/> Energy</span>
            <span>{Math.round(agent.energy)}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(100, agent.energy)}%` }}
            />
          </div>
        </div>
      </div>

      {/* DNA/Traits */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
          <Dna size={12}/> Traits
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800 p-2 rounded border border-gray-700">
            <div className="text-xs text-gray-400">Speed</div>
            <div className="font-mono">{agent.speed.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800 p-2 rounded border border-gray-700">
            <div className="text-xs text-gray-400">Sense</div>
            <div className="font-mono">{agent.senseRadius.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
