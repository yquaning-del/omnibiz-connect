import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { 
  Send, Loader2, Bot, User, Sparkles, 
  TrendingUp, Package, Users, Calendar, AlertCircle,
  Wrench, BedDouble, PillIcon
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
}

interface SuggestedQuery {
  icon: React.ReactNode;
  text: string;
  query: string;
}

export function AIChatAssistant() {
  const { currentOrganization, currentLocation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Dynamic suggestions based on vertical
  const vertical = currentLocation?.vertical || 'retail';
  
  const getSuggestedQueries = (): SuggestedQuery[] => {
    const base: SuggestedQuery[] = [
      { icon: <TrendingUp className="h-4 w-4" />, text: "Today's sales summary", query: "What are today's sales?" },
      { icon: <Package className="h-4 w-4" />, text: "Low stock items", query: "Show me products that are low on stock" },
      { icon: <Users className="h-4 w-4" />, text: "Top customers", query: "Who are my top customers?" },
    ];

    if (vertical === 'restaurant' || vertical === 'hotel') {
      base.push({ icon: <Calendar className="h-4 w-4" />, text: "Today's reservations", query: "What reservations do I have today?" });
    }
    if (vertical === 'hotel') {
      base.push({ icon: <BedDouble className="h-4 w-4" />, text: "Room availability", query: "Show me room availability" });
    }
    if (vertical === 'property') {
      base.push({ icon: <Wrench className="h-4 w-4" />, text: "Maintenance requests", query: "Show pending maintenance requests" });
    }
    if (vertical === 'pharmacy') {
      base.push({ icon: <PillIcon className="h-4 w-4" />, text: "Expiring medications", query: "What medications are expiring soon?" });
    }

    return base.slice(0, 4);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (query?: string) => {
    const messageText = query || input.trim();
    if (!messageText || !currentOrganization || !currentLocation) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-copilot', {
        body: {
          message: messageText,
          organizationId: currentOrganization.id,
          locationId: currentLocation.id,
          vertical: currentLocation.vertical,
          conversationHistory,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.response || "I couldn't process that request.",
        timestamp: new Date(),
        toolsUsed: data?.toolsUsed,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Copilot error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  const suggestedQueries = getSuggestedQueries();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b bg-primary/5">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Copilot
            <Badge variant="secondary" className="ml-auto text-xs">
              {vertical}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto text-primary/50 mb-3" />
                <h3 className="font-semibold text-lg">How can I help you?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask me anything about your {vertical} business
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Suggested queries</p>
                {suggestedQueries.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sq.query)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
                  >
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      {sq.icon}
                    </div>
                    <span className="text-sm">{sq.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' && "justify-end"
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      message.role === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}
                  >
                    <div 
                      className={cn(
                        "text-sm whitespace-pre-wrap",
                        message.role === 'assistant' && "prose prose-sm dark:prose-invert max-w-none"
                      )}
                      dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                    />
                    {message.toolsUsed && message.toolsUsed.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.toolsUsed.map((tool, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tool.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your business..."
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={() => handleSend()} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Powered by AI • Data from your {vertical} dashboard
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
