import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { LeaseClausesData } from './LeaseGenerationStep';

interface LeaseWordExportProps {
  lease: {
    lease_number: string;
    lease_type: string;
    start_date: string;
    end_date: string | null;
    monthly_rent: number;
    security_deposit: number;
    payment_due_day: number;
    late_fee_amount: number;
    grace_period_days: number;
    special_terms: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
    lease_document: LeaseClausesData | null;
    unit?: {
      unit_number: string;
      unit_type?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      bedrooms?: number | null;
      bathrooms?: number | null;
      square_footage?: number | null;
    };
  };
  tenantName: string;
  organizationName: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function LeaseWordExport({
  lease,
  tenantName,
  organizationName,
  variant = 'outline',
  size = 'default',
}: LeaseWordExportProps) {
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const generateWord = async () => {
    if (!lease.lease_document) {
      toast.error('No lease clauses available. Please generate the lease first.');
      return;
    }

    setLoading(true);
    try {
      const clauses = lease.lease_document;
      const sections: Paragraph[] = [];

      // Title
      sections.push(
        new Paragraph({
          text: 'RESIDENTIAL LEASE AGREEMENT',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );

      // Lease number
      sections.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: `Lease No: ${lease.lease_number}`,
              color: '666666',
              size: 20,
            }),
          ],
        })
      );

      // Helper to add section
      const addSection = (title: string, content: string) => {
        sections.push(
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          })
        );
        sections.push(
          new Paragraph({
            text: content,
            spacing: { after: 200 },
          })
        );
      };

      // Parties
      addSection(
        '1. PARTIES',
        `This Residential Lease Agreement ("Lease") is entered into as of ${formatDate(lease.start_date)}, by and between:`
      );
      sections.push(
        new Paragraph({
          text: `LANDLORD: ${organizationName}`,
          spacing: { after: 100 },
        })
      );
      sections.push(
        new Paragraph({
          text: `TENANT: ${tenantName}`,
          spacing: { after: 200 },
        })
      );

      // Property
      const propertyAddress = [
        lease.unit?.unit_number ? `Unit ${lease.unit.unit_number}` : '',
        lease.unit?.address || '',
        [lease.city || lease.unit?.city, lease.state || lease.unit?.state, lease.country || lease.unit?.country]
          .filter(Boolean)
          .join(', '),
      ]
        .filter(Boolean)
        .join(', ');

      addSection(
        '2. PROPERTY',
        `The Landlord hereby leases to the Tenant the following property: ${propertyAddress}`
      );

      // Term
      const termText =
        lease.lease_type === 'fixed'
          ? `This is a fixed-term lease commencing on ${formatDate(lease.start_date)} and ending on ${lease.end_date ? formatDate(lease.end_date) : 'N/A'}.`
          : `This is a month-to-month lease commencing on ${formatDate(lease.start_date)}. Either party may terminate this lease with 30 days written notice.`;
      addSection('3. LEASE TERM', termText);

      // Standard clauses
      addSection('4. RENT', clauses.rentTerms);
      addSection('5. SECURITY DEPOSIT', clauses.securityDepositRules);
      addSection('6. LATE FEES', clauses.lateFeePolicy);
      addSection('7. MAINTENANCE RESPONSIBILITIES', clauses.maintenanceResponsibilities);

      if (clauses.utilitiesAndServices) {
        addSection('8. UTILITIES AND SERVICES', clauses.utilitiesAndServices);
      }
      if (clauses.petPolicy) {
        addSection('9. PET POLICY', clauses.petPolicy);
      }
      if (clauses.noiseAndConduct) {
        addSection('10. NOISE AND CONDUCT', clauses.noiseAndConduct);
      }
      if (clauses.entryAndInspection) {
        addSection('11. ENTRY AND INSPECTION', clauses.entryAndInspection);
      }
      if (clauses.insuranceRequirements) {
        addSection('12. INSURANCE REQUIREMENTS', clauses.insuranceRequirements);
      }
      if (clauses.alterationsPolicy) {
        addSection('13. ALTERATIONS AND MODIFICATIONS', clauses.alterationsPolicy);
      }
      if (clauses.sublettingPolicy) {
        addSection('14. SUBLETTING', clauses.sublettingPolicy);
      }

      addSection('15. TERMINATION', clauses.terminationConditions);

      // Legal Notices
      if (clauses.legalNotices && clauses.legalNotices.length > 0) {
        sections.push(
          new Paragraph({
            text: '16. LEGAL NOTICES',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          })
        );
        clauses.legalNotices.forEach((notice, index) => {
          sections.push(
            new Paragraph({
              text: `${index + 1}. ${notice}`,
              spacing: { after: 100 },
            })
          );
        });
      }

      // Additional Clauses
      if (clauses.additionalClauses && clauses.additionalClauses.length > 0) {
        sections.push(
          new Paragraph({
            text: '17. ADDITIONAL PROVISIONS',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          })
        );
        clauses.additionalClauses.forEach((clause, index) => {
          sections.push(
            new Paragraph({
              text: `${index + 1}. ${clause}`,
              spacing: { after: 100 },
            })
          );
        });
      }

      // Special Terms
      if (lease.special_terms) {
        addSection('18. SPECIAL TERMS', lease.special_terms);
      }

      // Signature section
      sections.push(
        new Paragraph({
          text: 'SIGNATURES',
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
          spacing: { after: 200 },
        })
      );
      sections.push(
        new Paragraph({
          text: 'By signing below, both parties agree to all terms and conditions set forth in this Lease Agreement.',
          spacing: { after: 400 },
        })
      );

      // Signature table
      const signatureTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    text: 'LANDLORD:',
                    spacing: { after: 200 },
                    children: [new TextRun({ text: 'LANDLORD:', bold: true })],
                  }),
                  new Paragraph({ text: '' }),
                  new Paragraph({ text: '________________________________' }),
                  new Paragraph({ text: 'Signature', spacing: { after: 200 } }),
                  new Paragraph({ text: '________________________________' }),
                  new Paragraph({ text: 'Date', spacing: { after: 200 } }),
                  new Paragraph({ text: '________________________________' }),
                  new Paragraph({ text: 'Printed Name' }),
                ],
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: 'TENANT:',
                    spacing: { after: 200 },
                    children: [new TextRun({ text: 'TENANT:', bold: true })],
                  }),
                  new Paragraph({ text: '' }),
                  new Paragraph({ text: '________________________________' }),
                  new Paragraph({ text: 'Signature', spacing: { after: 200 } }),
                  new Paragraph({ text: '________________________________' }),
                  new Paragraph({ text: 'Date', spacing: { after: 200 } }),
                  new Paragraph({ text: '________________________________' }),
                  new Paragraph({ text: 'Printed Name' }),
                ],
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              }),
            ],
          }),
        ],
      });
      
      // Create the document
      const doc = new Document({
        sections: [
          {
            children: [...sections, signatureTable],
          },
        ],
      });

      // Generate and download
      const blob = await Packer.toBlob(doc);
      const fileName = `Lease_${lease.lease_number}_${tenantName.replace(/\s+/g, '_')}.docx`;
      saveAs(blob, fileName);
      toast.success('Lease Word document downloaded successfully!');
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast.error('Failed to generate Word document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={generateWord}
      disabled={loading || !lease.lease_document}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <FileText className="h-4 w-4 mr-2" />
      )}
      {size === 'icon' ? '' : 'Download Word'}
    </Button>
  );
}
