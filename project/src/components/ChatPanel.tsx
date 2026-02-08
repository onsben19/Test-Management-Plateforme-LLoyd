import React, { useState } from 'react';
import { Send, Bot, User, FileText, ChevronRight, ChevronLeft } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Bonjour ! Je suis votre assistant IA pour l\'orchestration des tests. Comment puis-je vous aider ?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Je traite votre demande. Voici quelques suggestions basées sur l\'analyse de vos tests...',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const generateSynthesis = () => {
    const synthesis: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: `**Synthèse Technique - ${new Date().toLocaleDateString('fr-FR')}**

**Résumé Exécutif:**
- 15 cas de tests analysés
- 3 anomalies critiques détectées
- Taux de réussite: 87%

**Recommandations:**
1. Prioriser les tests de régression sur le module de souscription
2. Optimiser les tests redondants identifiés
3. Renforcer la couverture des cas limites

**Actions Requises:**
- Révision des cas de tests critiques avant J+2
- Mise à jour de la documentation technique`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, synthesis]);
  };

  return (
    <div className={`fixed right-0 top-16 h-[calc(100vh-4rem)] bg-slate-800/95 backdrop-blur-sm border-l border-slate-700/50 transition-all duration-300 z-40 ${isOpen ? 'w-96' : 'w-12'
      }`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          {isOpen && (
            <>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-400" />
                <h3 className="font-medium text-white">Assistant IA</h3>
              </div>
              <button
                onClick={generateSynthesis}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors text-sm"
              >
                <FileText className="h-4 w-4" />
                Générer Synthèse IA
              </button>
            </>
          )}
          <button
            onClick={onToggle}
            className="p-2 text-slate-400 hover:text-white transition-colors ml-auto"
          >
            {isOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {isOpen && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'bot' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700/50 text-slate-200'
                      }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {message.type === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-700/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Posez votre question..."
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;