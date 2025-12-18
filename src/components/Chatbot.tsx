import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { chatbotData, suggestedQuestions } from '../utils/chatbotData';
import { useRouter } from '../context/RouterContext';
interface Message {
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
  action?: {
    type: 'navigate';
    label: string;
    page: 'home' | 'about' | 'games' | 'staff-application' | 'support' | 'links';
  };
}
interface ChatbotItem {
  keywords: string[];
  answer: string;
  navigateTo?: 'home' | 'about' | 'games' | 'staff-application' | 'support' | 'links';
  navigateLabel?: string;
}
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    type: 'bot',
    text: 'היי! 👋 אני הבוט של LSC ואני כאן לעזור לך. מה תרצה לדעת?',
    timestamp: new Date()
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    navigateTo
  } = useRouter();
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const findAnswer = (query: string): {
    answer: string;
    item?: ChatbotItem;
  } => {
    const lowerQuery = query.toLowerCase();
    for (const item of chatbotData) {
      for (const keyword of item.keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          return {
            answer: item.answer,
            item
          };
        }
      }
    }
    return {
      answer: 'לא הצלחתי למצוא תשובה לשאלה שלך 😅 נסה לשאול בצורה אחרת, או בוא לדבר איתנו בדיסקורד!'
    };
  };
  const handleNavigate = (page: Message['action']['page']) => {
    navigateTo(page);
    setIsOpen(false);
  };
  const handleSendMessage = (message?: string) => {
    const textToSend = message || inputValue.trim();
    if (!textToSend) return;
    const userMessage: Message = {
      type: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setTimeout(() => {
      const {
        answer,
        item
      } = findAnswer(textToSend);
      const botMessage: Message = {
        type: 'bot',
        text: answer,
        timestamp: new Date(),
        action: item?.navigateTo ? {
          type: 'navigate',
          label: item.navigateLabel || 'לחץ כאן',
          page: item.navigateTo
        } : undefined
      };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 600);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };
  return <>
      {/* Floating Button */}
      {!isOpen && <button onClick={() => setIsOpen(true)} className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group" title="פתח צאטבוט">
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
        </button>}

      {/* Chat Window */}
      {isOpen && <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 z-50 sm:w-[380px] sm:h-[550px] md:w-[420px] md:h-[600px] bg-slate-900/95 sm:rounded-2xl shadow-2xl border-0 sm:border sm:border-slate-700/50 flex flex-col overflow-hidden backdrop-blur-xl">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-4 sm:p-5 flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-base sm:text-lg">​בוט</h3>
                  <User className="w-4 h-4 bg-primary text-white" />
                </div>
                <p className="text-blue-100 text-xs sm:text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  מוכן לעזור
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="relative z-10 text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-200" title="סגור">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {messages.map((msg, idx) => <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[80%]">
                  <div className={`px-4 py-3 rounded-2xl text-sm sm:text-base leading-relaxed ${msg.type === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md shadow-lg shadow-blue-500/20' : 'bg-slate-800/80 text-gray-100 rounded-bl-md border border-slate-700/50'}`}>
                    {msg.text}
                  </div>
                  
                  {/* Navigation Action Button */}
                  {msg.action && <button onClick={() => handleNavigate(msg.action!.page)} className="self-start mt-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm rounded-xl transition-all duration-200 shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95">
                      {msg.action.label}
                    </button>}
                </div>
              </div>)}

            {/* Loading Animation */}
            {isLoading && <div className="flex justify-start">
                <div className="bg-slate-800/80 text-gray-200 px-4 py-3 rounded-2xl rounded-bl-md border border-slate-700/50">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" />
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{
                animationDelay: '0.15s'
              }} />
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{
                animationDelay: '0.3s'
              }} />
                  </div>
                </div>
              </div>}

            {/* Suggested Questions */}
            {messages.length === 1 && <div className="space-y-3 pt-2">
                <p className="text-gray-400 text-xs sm:text-sm text-center">שאלות נפוצות:</p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedQuestions.map((question, idx) => <button key={idx} onClick={() => handleSendMessage(question)} className="w-full px-4 py-3 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 hover:border-blue-500/50 rounded-xl text-gray-200 text-sm transition-all duration-200 text-right hover:scale-[1.02] active:scale-[0.98]">
                      {question}
                    </button>)}
                </div>
              </div>}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-700/50 p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="flex gap-2 sm:gap-3">
              <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="שאל אותי משהו..." className="flex-1 bg-slate-800/80 text-white px-4 py-3 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/50 placeholder-gray-500 transition-all duration-200" disabled={isLoading} />
              <button onClick={() => handleSendMessage()} disabled={isLoading || !inputValue.trim()} className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 disabled:shadow-none disabled:hover:scale-100" title="שלח">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>}
    </>;
}