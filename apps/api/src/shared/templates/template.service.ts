import { Injectable } from '@nestjs/common';
import type { IndustryTemplate, IndustryTemplateSummary } from '@hrms/shared';

import * as itServicesTemplate from '../../templates/industry/it-services.json';
import * as manufacturingTemplate from '../../templates/industry/manufacturing.json';
import * as healthcareTemplate from '../../templates/industry/healthcare.json';
import * as retailTemplate from '../../templates/industry/retail.json';
import * as customTemplate from '../../templates/industry/custom.json';

@Injectable()
export class TemplateService {
  private readonly templates: Map<string, IndustryTemplate>;

  constructor() {
    this.templates = new Map<string, IndustryTemplate>();

    const allTemplates: IndustryTemplate[] = [
      itServicesTemplate as IndustryTemplate,
      manufacturingTemplate as IndustryTemplate,
      healthcareTemplate as IndustryTemplate,
      retailTemplate as IndustryTemplate,
      customTemplate as IndustryTemplate,
    ];

    for (const template of allTemplates) {
      this.templates.set(template.id, template);
    }
  }

  listTemplates(): IndustryTemplateSummary[] {
    return Array.from(this.templates.values()).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
    }));
  }

  getTemplate(industryId: string): IndustryTemplate | null {
    return this.templates.get(industryId) ?? null;
  }

  getTemplateByIndustryName(name: string): IndustryTemplate | null {
    const lowerName = name.toLowerCase();

    for (const template of this.templates.values()) {
      if (template.name.toLowerCase().includes(lowerName) || lowerName.includes(template.name.toLowerCase())) {
        return template;
      }
    }

    // Fallback to custom template if no match found
    return this.templates.get('custom') ?? null;
  }
}
