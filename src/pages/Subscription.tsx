import { SubscriptionPlans } from '@/pages/subscription/SubscriptionPlans';

export default function Subscription() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-muted-foreground">
          Select the plan that best fits your business needs
        </p>
      </div>
      
      <SubscriptionPlans />
    </div>
  );
}
