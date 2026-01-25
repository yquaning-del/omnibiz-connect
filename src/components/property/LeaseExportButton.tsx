import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LeaseClausesData } from './LeaseGenerationStep';

interface LeaseExportButtonProps {
  leaseData: {
    leaseNumber?: string;
    leaseType: string;
    startDate: string;
    endDate?: string;
    monthlyRent: string;
    securityDeposit: string;
    paymentDueDay: string;
    lateFeeAmount: string;
    gracePeriodDays: string;
    specialTerms?: string;
    country?: string;
    state?: string;
    city?: string;
    address?: string;
  };
  unitDetails?: {
    unit_number: string;
    unit_type?: string;
    bedrooms?: number;
    bathrooms?: number;
    square_footage?: number;
    address?: string;
  };
  tenantName?: string;
  tenantEmail?: string;
  organizationName?: string;
  clauses: LeaseClausesData | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function LeaseExportButton({
  leaseData,
  unitDetails,
  tenantName,
  tenantEmail,
  organizationName,
  clauses,
  variant = 'outline',
  size = 'default',
}: LeaseExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const generatePDF = async () => {
    if (!clauses) {
      toast.error('No lease clauses available. Please generate the lease first.');
      return;
    }

    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Helper function to add section header
      const addSectionHeader = (title: string) => {
        if (yPosition > 260) {
          doc.addPage();
          yPosition = margin;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(33, 37, 41);
        doc.text(title, margin, yPosition);
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(73, 80, 87);
      };

      // Helper function to add paragraph
      const addParagraph = (text: string) => {
        const lines = doc.splitTextToSize(text, contentWidth);
        
        // Check if we need a new page
        const lineHeight = 5;
        const requiredHeight = lines.length * lineHeight + 5;
        if (yPosition + requiredHeight > 280) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.text(lines, margin, yPosition);
        yPosition += lines.length * lineHeight + 5;
      };

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('RESIDENTIAL LEASE AGREEMENT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Lease number
      if (leaseData.leaseNumber) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Lease No: ${leaseData.leaseNumber}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;
      } else {
        yPosition += 5;
      }

      // Parties Section
      addSectionHeader('1. PARTIES');
      addParagraph(
        `This Residential Lease Agreement ("Lease") is entered into as of ${formatDate(leaseData.startDate)}, by and between:`
      );
      addParagraph(`LANDLORD: ${organizationName || 'Property Management Company'}`);
      addParagraph(`TENANT: ${tenantName || 'Tenant Name'}${tenantEmail ? ` (${tenantEmail})` : ''}`);

      // Property Section
      addSectionHeader('2. PROPERTY');
      const propertyAddress = [
        unitDetails?.unit_number ? `Unit ${unitDetails.unit_number}` : '',
        leaseData.address || unitDetails?.address || '',
        [leaseData.city, leaseData.state, leaseData.country].filter(Boolean).join(', '),
      ].filter(Boolean).join(', ');
      addParagraph(`The Landlord hereby leases to the Tenant the following property: ${propertyAddress}`);
      
      if (unitDetails) {
        const features = [
          unitDetails.unit_type ? `Type: ${unitDetails.unit_type}` : '',
          unitDetails.bedrooms ? `Bedrooms: ${unitDetails.bedrooms}` : '',
          unitDetails.bathrooms ? `Bathrooms: ${unitDetails.bathrooms}` : '',
          unitDetails.square_footage ? `Square Footage: ${unitDetails.square_footage} sq ft` : '',
        ].filter(Boolean).join(' | ');
        if (features) {
          addParagraph(features);
        }
      }

      // Term Section
      addSectionHeader('3. LEASE TERM');
      if (leaseData.leaseType === 'fixed') {
        addParagraph(
          `This is a fixed-term lease commencing on ${formatDate(leaseData.startDate)} and ending on ${leaseData.endDate ? formatDate(leaseData.endDate) : 'N/A'}.`
        );
      } else {
        addParagraph(
          `This is a month-to-month lease commencing on ${formatDate(leaseData.startDate)}. Either party may terminate this lease with 30 days written notice.`
        );
      }

      // Rent Terms
      addSectionHeader('4. RENT');
      addParagraph(clauses.rentTerms);

      // Security Deposit
      addSectionHeader('5. SECURITY DEPOSIT');
      addParagraph(clauses.securityDepositRules);

      // Late Fee Policy
      addSectionHeader('6. LATE FEES');
      addParagraph(clauses.lateFeePolicy);

      // Maintenance
      addSectionHeader('7. MAINTENANCE RESPONSIBILITIES');
      addParagraph(clauses.maintenanceResponsibilities);

      // Utilities
      if (clauses.utilitiesAndServices) {
        addSectionHeader('8. UTILITIES AND SERVICES');
        addParagraph(clauses.utilitiesAndServices);
      }

      // Pet Policy
      if (clauses.petPolicy) {
        addSectionHeader('9. PET POLICY');
        addParagraph(clauses.petPolicy);
      }

      // Noise and Conduct
      if (clauses.noiseAndConduct) {
        addSectionHeader('10. NOISE AND CONDUCT');
        addParagraph(clauses.noiseAndConduct);
      }

      // Entry and Inspection
      if (clauses.entryAndInspection) {
        addSectionHeader('11. ENTRY AND INSPECTION');
        addParagraph(clauses.entryAndInspection);
      }

      // Insurance
      if (clauses.insuranceRequirements) {
        addSectionHeader('12. INSURANCE REQUIREMENTS');
        addParagraph(clauses.insuranceRequirements);
      }

      // Alterations
      if (clauses.alterationsPolicy) {
        addSectionHeader('13. ALTERATIONS AND MODIFICATIONS');
        addParagraph(clauses.alterationsPolicy);
      }

      // Subletting
      if (clauses.sublettingPolicy) {
        addSectionHeader('14. SUBLETTING');
        addParagraph(clauses.sublettingPolicy);
      }

      // Termination
      addSectionHeader('15. TERMINATION');
      addParagraph(clauses.terminationConditions);

      // Legal Notices
      if (clauses.legalNotices && clauses.legalNotices.length > 0) {
        addSectionHeader('16. LEGAL NOTICES');
        clauses.legalNotices.forEach((notice, index) => {
          addParagraph(`${index + 1}. ${notice}`);
        });
      }

      // Additional Clauses
      if (clauses.additionalClauses && clauses.additionalClauses.length > 0) {
        addSectionHeader('17. ADDITIONAL PROVISIONS');
        clauses.additionalClauses.forEach((clause, index) => {
          addParagraph(`${index + 1}. ${clause}`);
        });
      }

      // Special Terms
      if (leaseData.specialTerms) {
        addSectionHeader('18. SPECIAL TERMS');
        addParagraph(leaseData.specialTerms);
      }

      // Signature Block
      doc.addPage();
      yPosition = margin;

      addSectionHeader('SIGNATURES');
      addParagraph(
        'By signing below, both parties agree to all terms and conditions set forth in this Lease Agreement.'
      );

      yPosition += 10;

      // Landlord Signature
      doc.setFont('helvetica', 'bold');
      doc.text('LANDLORD:', margin, yPosition);
      yPosition += 15;
      doc.setFont('helvetica', 'normal');
      doc.line(margin, yPosition, margin + 80, yPosition);
      yPosition += 5;
      doc.setFontSize(8);
      doc.text('Signature', margin, yPosition);
      yPosition += 10;
      doc.line(margin, yPosition, margin + 80, yPosition);
      yPosition += 5;
      doc.text('Date', margin, yPosition);
      yPosition += 10;
      doc.line(margin, yPosition, margin + 80, yPosition);
      yPosition += 5;
      doc.text('Printed Name', margin, yPosition);

      yPosition += 20;

      // Tenant Signature
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TENANT:', margin, yPosition);
      yPosition += 15;
      doc.setFont('helvetica', 'normal');
      doc.line(margin, yPosition, margin + 80, yPosition);
      yPosition += 5;
      doc.setFontSize(8);
      doc.text('Signature', margin, yPosition);
      yPosition += 10;
      doc.line(margin, yPosition, margin + 80, yPosition);
      yPosition += 5;
      doc.text('Date', margin, yPosition);
      yPosition += 10;
      doc.line(margin, yPosition, margin + 80, yPosition);
      yPosition += 5;
      doc.text('Printed Name', margin, yPosition);

      // Footer on each page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
        doc.text(
          `Generated: ${new Date().toLocaleDateString()}`,
          pageWidth - margin,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      }

      // Download
      const fileName = `Lease_${leaseData.leaseNumber || 'Draft'}_${tenantName?.replace(/\s+/g, '_') || 'Tenant'}.pdf`;
      doc.save(fileName);
      toast.success('Lease PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={generatePDF}
      disabled={loading || !clauses}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {size === 'icon' ? '' : 'Download PDF'}
    </Button>
  );
}
