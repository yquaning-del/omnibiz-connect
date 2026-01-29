import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, Send, Loader2, Bot, User, Sparkles, 
  TrendingUp, Package, Users, Calendar, X
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
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

  const suggestedQueries: SuggestedQuery[] = [
    { icon: <TrendingUp className="h-4 w-4" />, text: "Today's sales summary", query: "What are today's sales?" },
    { icon: <Package className="h-4 w-4" />, text: "Low stock items", query: "Show me products that are low on stock" },
    { icon: <Users className="h-4 w-4" />, text: "Top customers", query: "Who are my top customers this month?" },
    { icon: <Calendar className="h-4 w-4" />, text: "Upcoming reservations", query: "What reservations do I have today?" },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const processQuery = async (query: string) => {
    if (!currentOrganization || !currentLocation) return null;

    const lowerQuery = query.toLowerCase();

    // Sales queries
    if (lowerQuery.includes('sales') || lowerQuery.includes('revenue')) {
      const today = new Date().toISOString().split('T')[0];
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('location_id', currentLocation.id)
        .gte('created_at', today);

      const totalSales = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const orderCount = orders?.length || 0;

      return {
        message: `📊 **Today's Sales Summary**\n\n- Total Revenue: **$${totalSales.toFixed(2)}**\n- Orders: **${orderCount}**\n- Average Order: **$${orderCount > 0 ? (totalSales / orderCount).toFixed(2) : '0.00'}**`,
        data: { totalSales, orderCount },
      };
    }

    // Low stock queries
    if (lowerQuery.includes('low stock') || lowerQuery.includes('inventory')) {
      const { data: products } = await supabase
        .from('products')
        .select('name, stock_quantity, low_stock_threshold')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true);

      const lowStock = products?.filter(p => p.stock_quantity <= p.low_stock_threshold) || [];

      if (lowStock.length === 0) {
        return { message: "✅ Great news! All products are well-stocked.", data: [] };
      }

      const list = lowStock.slice(0, 10).map(p => 
        `- **${p.name}**: ${p.stock_quantity} units (threshold: ${p.low_stock_threshold})`
      ).join('\n');

      return {
        message: `⚠️ **Low Stock Alert**\n\n${lowStock.length} product(s) need attention:\n\n${list}${lowStock.length > 10 ? `\n\n...and ${lowStock.length - 10} more` : ''}`,
        data: lowStock,
      };
    }

    // Customer queries
    if (lowerQuery.includes('customer') || lowerQuery.includes('top')) {
      const { data: customers } = await supabase
        .from('customers')
        .select('full_name, email, loyalty_points')
        .eq('organization_id', currentOrganization.id)
        .order('loyalty_points', { ascending: false })
        .limit(5);

      if (!customers?.length) {
        return { message: "No customer data available yet.", data: [] };
      }

      const list = customers.map((c, i) => 
        `${i + 1}. **${c.full_name}** - ${c.loyalty_points} points`
      ).join('\n');

      return {
        message: `👥 **Top Customers by Loyalty Points**\n\n${list}`,
        data: customers,
      };
    }

    // Reservations
    if (lowerQuery.includes('reservation') || lowerQuery.includes('booking')) {
      const today = new Date().toISOString().split('T')[0];
      const { data: reservations } = await supabase
        .from('reservations')
        .select('guest_name, guest_count, check_in, status, reservation_type')
        .eq('location_id', currentLocation.id)
        .gte('check_in', today)
        .order('check_in');

      if (!reservations?.length) {
        return { message: "📅 No upcoming reservations found.", data: [] };
      }

      const list = reservations.slice(0, 5).map(r => {
        const time = new Date(r.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `- **${r.guest_name}** (${r.guest_count} guests) at ${time} - ${r.status}`;
      }).join('\n');

      return {
        message: `📅 **Upcoming Reservations** (${reservations.length} total)\n\n${list}`,
        data: reservations,
      };
    }

    // Default response
    return {
      message: "I can help you with:\n\n- 📊 Sales and revenue data\n- 📦 Inventory and stock levels\n- 👥 Customer information\n- 📅 Reservations and bookings\n\nTry asking something like \"What are today's sales?\" or \"Show me low stock items\".",
      data: null,
    };
  };

  const handleSend = async (query?: string) => {
    const messageText = query || input.trim();
    if (!messageText) return;

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
      const result = await processQuery(messageText);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result?.message || "I'm sorry, I couldn't process that request.",
        timestamp: new Date(),
        data: result?.data,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI query error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, something went wrong. Please try again.",
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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b bg-primary/5">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Assistant
            <Badge variant="secondary" className="ml-auto text-xs">Beta</Badge>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto text-primary/50 mb-3" />
                <h3 className="font-semibold text-lg">How can I help you?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask me about your business data
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
                      dangerouslySetInnerHTML={{ 
                        __html: message.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>') 
                      }}
                    />
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
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
