import React from 'react';
import { X, AlertTriangle, Zap } from 'lucide-react';
import { Badge } from '@radix-ui/themes';

interface TestCase {
  id: string;
  name: string;
  type: 'normal' | 'redundant' | 'critical';
  description: string;
}

interface AIPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCases: TestCase[];
}

const AIPreviewModal: React.FC<AIPreviewModalProps> = ({ isOpen, onClose, testCases }) => {
  if (!isOpen) return null;

  const getTestTypeColor = (type: TestCase['type']) => {
    switch (type) {
      case 'redundant':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
      case 'critical':
        return 'bg-red-500/20 border-red-500/50 text-red-300';
      default:
        return 'bg-slate-700/50 border-slate-600/50 text-slate-300';
    }
  };

  const getTestTypeIcon = (type: TestCase['type']) => {
    switch (type) {
      case 'redundant':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
        return <Zap className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Prévisualisation IA</h2>
            <p className="text-slate-400 text-sm">Analyse automatique des cas de tests</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid gap-4">
            {testCases.map((testCase) => (
              <div
                key={testCase.id}
                className={`p-4 rounded-lg border ${getTestTypeColor(testCase.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTestTypeIcon(testCase.type)}
                      <h3 className="font-medium">{testCase.name}</h3>
                      {testCase.type !== 'normal' && (
                        <Badge 
                          color={testCase.type === 'critical' ? 'red' : 'yellow'}
                          variant="soft"
                        >
                          {testCase.type === 'critical' ? 'Priorité Critique' : 'Test Redondant'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm opacity-80">{testCase.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Confirmer l'import
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPreviewModal;