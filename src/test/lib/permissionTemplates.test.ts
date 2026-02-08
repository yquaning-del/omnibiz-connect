import { describe, it, expect } from 'vitest';
import {
  PROPERTY_TEMPLATES,
  RESTAURANT_TEMPLATES,
  HOTEL_TEMPLATES,
  PHARMACY_TEMPLATES,
  RETAIL_TEMPLATES,
  getTemplatesForVertical,
  getTemplateByName,
  type PermissionTemplate,
} from '@/lib/permissionTemplates';
import type { BusinessVertical } from '@/types';

describe('Permission Templates', () => {
  describe('Template arrays', () => {
    it('should have property templates', () => {
      expect(PROPERTY_TEMPLATES).toBeDefined();
      expect(Array.isArray(PROPERTY_TEMPLATES)).toBe(true);
      expect(PROPERTY_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have restaurant templates', () => {
      expect(RESTAURANT_TEMPLATES).toBeDefined();
      expect(Array.isArray(RESTAURANT_TEMPLATES)).toBe(true);
      expect(RESTAURANT_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have hotel templates', () => {
      expect(HOTEL_TEMPLATES).toBeDefined();
      expect(Array.isArray(HOTEL_TEMPLATES)).toBe(true);
      expect(HOTEL_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have pharmacy templates', () => {
      expect(PHARMACY_TEMPLATES).toBeDefined();
      expect(Array.isArray(PHARMACY_TEMPLATES)).toBe(true);
      expect(PHARMACY_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have retail templates', () => {
      expect(RETAIL_TEMPLATES).toBeDefined();
      expect(Array.isArray(RETAIL_TEMPLATES)).toBe(true);
      expect(RETAIL_TEMPLATES.length).toBeGreaterThan(0);
    });
  });

  describe('Template structure', () => {
    const validateTemplate = (template: PermissionTemplate) => {
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('icon');
      expect(template).toHaveProperty('permissions');
      expect(typeof template.name).toBe('string');
      expect(typeof template.description).toBe('string');
      expect(Array.isArray(template.permissions)).toBe(true);
      expect(template.permissions.length).toBeGreaterThan(0);
    };

    it('should have valid property template structure', () => {
      PROPERTY_TEMPLATES.forEach(validateTemplate);
    });

    it('should have valid restaurant template structure', () => {
      RESTAURANT_TEMPLATES.forEach(validateTemplate);
    });

    it('should have valid hotel template structure', () => {
      HOTEL_TEMPLATES.forEach(validateTemplate);
    });

    it('should have valid pharmacy template structure', () => {
      PHARMACY_TEMPLATES.forEach(validateTemplate);
    });

    it('should have valid retail template structure', () => {
      RETAIL_TEMPLATES.forEach(validateTemplate);
    });
  });

  describe('getTemplatesForVertical', () => {
    it('should return property templates for property vertical', () => {
      const templates = getTemplatesForVertical('property');
      expect(templates).toBe(PROPERTY_TEMPLATES);
    });

    it('should return restaurant templates for restaurant vertical', () => {
      const templates = getTemplatesForVertical('restaurant');
      expect(templates).toBe(RESTAURANT_TEMPLATES);
    });

    it('should return hotel templates for hotel vertical', () => {
      const templates = getTemplatesForVertical('hotel');
      expect(templates).toBe(HOTEL_TEMPLATES);
    });

    it('should return pharmacy templates for pharmacy vertical', () => {
      const templates = getTemplatesForVertical('pharmacy');
      expect(templates).toBe(PHARMACY_TEMPLATES);
    });

    it('should return retail templates for retail vertical', () => {
      const templates = getTemplatesForVertical('retail');
      expect(templates).toBe(RETAIL_TEMPLATES);
    });

    it('should return retail templates as default for unknown vertical', () => {
      const templates = getTemplatesForVertical('unknown' as BusinessVertical);
      expect(templates).toBe(RETAIL_TEMPLATES);
    });
  });

  describe('getTemplateByName', () => {
    it('should find property template by name', () => {
      const template = getTemplateByName('property', 'Property Manager');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Property Manager');
      expect(template?.permissions).toContain('property.dashboard');
    });

    it('should find restaurant template by name', () => {
      const template = getTemplateByName('restaurant', 'Cashier');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Cashier');
      expect(template?.permissions).toContain('restaurant.pos');
    });

    it('should find hotel template by name', () => {
      const template = getTemplateByName('hotel', 'Front Desk Agent');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Front Desk Agent');
      expect(template?.permissions).toContain('hotel.front_desk');
    });

    it('should find pharmacy template by name', () => {
      const template = getTemplateByName('pharmacy', 'Pharmacist');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Pharmacist');
      expect(template?.permissions).toContain('pharmacy.prescriptions');
    });

    it('should find retail template by name', () => {
      const template = getTemplateByName('retail', 'Store Manager');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Store Manager');
      expect(template?.permissions).toContain('retail.dashboard');
    });

    it('should return undefined for non-existent template', () => {
      const template = getTemplateByName('property', 'Non-existent Role');
      expect(template).toBeUndefined();
    });
  });
});
