import React from 'react';
import { Badge } from '@radix-ui/themes';
import { Play, Pause, CheckCircle, XCircle, Clock } from 'lucide-react';

interface TestCase {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'paused';
  priority: 'low' | 'medium' | 'high' | 'critical';
  duration?: string;
  description: string;
}

interface TestCaseListProps {
  testCases: TestCase[];
  onRunTest: (id: string) => void;
  onPauseTest: (id: string) => void;
}

const TestCaseList: React.FC<TestCaseListProps> = ({ testCases, onRunTest, onPauseTest }) => {
  const getStatusIcon = (status: TestCase['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-400 animate-spin" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: TestCase['status']) => {
    switch (status) {
      case 'running':
        return 'blue';
      case 'passed':
        return 'green';
      case 'failed':
        return 'red';
      case 'paused':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getPriorityColor = (priority: TestCase['priority']) => {
    switch (priority) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl">
      <div className="px-6 py-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-white">Cas de Tests</h3>
        <p className="text-slate-400 text-sm">{testCases.length} tests chargés</p>
      </div>
      
      <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
        {testCases.map((testCase) => (
          <div key={testCase.id} className="p-4 hover:bg-slate-800/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(testCase.status)}
                  <h4 className="font-medium text-white truncate">{testCase.name}</h4>
                  <Badge color={getPriorityColor(testCase.priority)} variant="soft">
                    {testCase.priority}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400 mb-2">{testCase.description}</p>
                <div className="flex items-center gap-4">
                  <Badge color={getStatusColor(testCase.status)} variant="soft">
                    {testCase.status}
                  </Badge>
                  {testCase.duration && (
                    <span className="text-xs text-slate-500">
                      Durée: {testCase.duration}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {testCase.status === 'running' ? (
                  <button
                    onClick={() => onPauseTest(testCase.id)}
                    className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => onRunTest(testCase.id)}
                    className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                    disabled={testCase.status === 'running'}
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestCaseList;