import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  ThumbsUp,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type FeedbackType = "bug" | "feature" | "feedback";

interface FeedbackWidgetProps {
  variant?: "floating" | "inline";
}

export function FeedbackWidget({ variant = "floating" }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("feedback");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, currentOrganization } = useAuth();

  const feedbackTypes = [
    { value: "bug", label: "Report a Bug", icon: Bug, color: "text-red-500" },
    { value: "feature", label: "Request Feature", icon: Lightbulb, color: "text-yellow-500" },
    { value: "feedback", label: "General Feedback", icon: ThumbsUp, color: "text-blue-500" },
  ];

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("feedback_submissions").insert({
      user_id: user?.id,
      organization_id: currentOrganization?.id,
      type,
      content: content.trim(),
      rating,
      page_url: window.location.pathname,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to submit feedback");
      console.error("Feedback error:", error);
    } else {
      toast.success("Thank you for your feedback!");
      setIsOpen(false);
      setContent("");
      setRating(null);
      setType("feedback");
    }
  };

  const triggerButton = variant === "floating" ? (
    <Button
      className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-40"
      size="icon"
    >
      <MessageSquare className="h-5 w-5" />
    </Button>
  ) : (
    <Button variant="outline" size="sm">
      <MessageSquare className="h-4 w-4 mr-2" />
      Feedback
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your thoughts, reporting issues, or requesting features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>What type of feedback?</Label>
            <RadioGroup
              value={type}
              onValueChange={(value) => setType(value as FeedbackType)}
              className="grid grid-cols-3 gap-2"
            >
              {feedbackTypes.map((ft) => {
                const Icon = ft.icon;
                return (
                  <div key={ft.value}>
                    <RadioGroupItem
                      value={ft.value}
                      id={ft.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={ft.value}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 cursor-pointer transition-colors
                        peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                        hover:bg-muted`}
                    >
                      <Icon className={`h-5 w-5 ${ft.color}`} />
                      <span className="text-xs font-medium">{ft.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Your feedback</Label>
            <Textarea
              id="content"
              placeholder={
                type === "bug"
                  ? "Describe the issue you encountered..."
                  : type === "feature"
                  ? "What feature would you like to see?"
                  : "Share your thoughts..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>

          {type === "feedback" && (
            <div className="space-y-2">
              <Label>How would you rate your experience?</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`p-1 transition-colors ${
                      rating && rating >= value
                        ? "text-yellow-400"
                        : "text-muted-foreground hover:text-yellow-400"
                    }`}
                  >
                    <Star
                      className="h-6 w-6"
                      fill={rating && rating >= value ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
