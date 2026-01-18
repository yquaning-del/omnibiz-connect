import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How does the 14-day free trial work?',
    answer: 'Start your free trial with full access to all features. No credit card required. After 14 days, choose a plan that fits your business or continue with limited features.',
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Absolutely! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at your next billing cycle.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express) and can arrange invoicing for Enterprise customers. All payments are processed securely through Stripe.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Security is our top priority. We use bank-level encryption, are SOC 2 compliant, and perform regular security audits. Your data is backed up daily and stored in secure, redundant data centers.',
  },
  {
    question: 'Do you offer discounts for non-profits?',
    answer: 'Yes! We offer special pricing for registered non-profit organizations. Contact our sales team to learn more about our non-profit program.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'All plans include email support. Professional plans get priority support with faster response times. Enterprise customers receive dedicated account management and 24/7 phone support.',
  },
  {
    question: 'Can I import my existing data?',
    answer: 'Yes! We provide comprehensive data import tools that support CSV files and integration with major POS systems. Our team can also assist with custom data migrations.',
  },
  {
    question: 'Is there a setup fee?',
    answer: 'No setup fees for Starter and Professional plans. Enterprise plans may include optional professional services for custom implementations, which are quoted separately.',
  },
];

export function PricingFAQ() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
          <AccordionTrigger className="text-left text-foreground hover:text-primary">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
