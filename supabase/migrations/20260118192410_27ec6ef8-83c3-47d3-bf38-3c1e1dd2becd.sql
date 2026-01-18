-- Drop overly permissive policies and replace with authenticated-only
DROP POLICY IF EXISTS "System can insert notifications" ON user_notifications;
DROP POLICY IF EXISTS "System can insert achievements" ON user_achievements;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback_submissions;

-- Users can insert their own notifications (or service role can)
CREATE POLICY "Users can insert own notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own achievements (or service role can)  
CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can submit feedback
CREATE POLICY "Authenticated users can submit feedback"
  ON feedback_submissions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);