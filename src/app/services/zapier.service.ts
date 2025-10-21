import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FormData {
  selectedResponse: string;
  cancelReasons: string[];
  otherReason?: string; 
  marketingConsent: string;
  englishImpact: string;
  preferredStartTime: string;
  paymentReadiness: string;
  pricingResponse: string;
  name?: string;
  email?: string;
  campaignName?: string;
  adsetName?: string;
  adName?: string;
  fbClickId?: string;
  // Analytics data
  sessionId?: string;
  trigger?: string;
  timestamp?: string;
  totalSessionTime?: number;
  events?: any;
  userAgent?: string;
  pageUrl?: string;
  formStarted?: boolean;
  formSubmitted?: boolean;
  formInteractionTime?: number;
  description?: string;
}

export interface LeadFormData {
  // Lead form specific fields
  englishLessonsHistory: string;
  levelPreference: string;
  availability: string;
  specificTimeSlot: string;
  name: string;
  phone: string;
  whatsappSame: string;
  whatsappNumber?: string;
  email: string;
  state: string;
  campaignName?: string;
  adsetName?: string;
  adName?: string;
  fbClickId?: string;
  // Additional metadata
  submissionDate?: string;
  sourceUrl?: string;
  userAgent?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZapierService {
  // Webhook URLs for different purposes
  private readonly LEAD_FORM_WEBHOOK_URL = 'https://hook.us1.make.com/bsfdoly1dekmske3r620ydu5p3d3hnor';
  // private readonly CONFIRMATION_WEBHOOK_URL = 'https://hook.us1.make.com/uc37wscl0r75np86zrss260m9mecyubf';
  private readonly CONFIRMATION_WEBHOOK_URL = 'https://hook.us1.make.com/mg2gg69ynee6or7x8pv5pzt1x3ewjl1t';

  constructor(private http: HttpClient) {}

  // Send lead form data to Zapier webhook
  async sendLeadFormToZapier(leadFormData: LeadFormData): Promise<any> {
    try {
      // Create URL parameters for the webhook
      const params = new URLSearchParams();
      
      // Basic lead information
      params.set('first_name', leadFormData.name || 'Prospect');
      params.set('last_name', 'Nevys');
      params.set('company', 'Nevy\'s Language Prospect');
      params.set('lead_source', 'Arabic Lead Form');
      params.set('status', 'New');
      params.set('email', leadFormData.email || '');
      
      // Lead form specific fields
      params.set('english_lessons_history', leadFormData.englishLessonsHistory || '');
      params.set('level_preference', leadFormData.levelPreference || '');
      params.set('availability', leadFormData.availability || '');
      params.set('specific_time_slot', leadFormData.specificTimeSlot || '');
      
      // Additional field names for better Salesforce mapping
      params.set('best_time_to_contact', leadFormData.availability || '');
      params.set('detailed_call_time', leadFormData.specificTimeSlot || '');
      
      params.set('phone', leadFormData.phone || '');
      params.set('whatsapp_same', leadFormData.whatsappSame || '');
      
      if (leadFormData.whatsappSame === 'no' && leadFormData.whatsappNumber) {
        params.set('whatsapp_number', leadFormData.whatsappNumber);
      }
      
      params.set('state', leadFormData.state || '');
      
      // Additional field mappings for comprehensive data capture
      params.set('english_level', leadFormData.englishLessonsHistory || '');
      params.set('preferred_level', leadFormData.levelPreference || '');
      
      // Campaign tracking data
      if (leadFormData.campaignName) {
        params.set('campaign_name', leadFormData.campaignName);
      }
      if (leadFormData.adsetName) {
        params.set('adset_name', leadFormData.adsetName);
      }
      if (leadFormData.adName) {
        params.set('ad_name', leadFormData.adName);
      }
      if (leadFormData.fbClickId) {
        params.set('fb_click_id', leadFormData.fbClickId);
      }
      
      // Additional metadata
      params.set('submission_date', new Date().toISOString());
      params.set('source_url', window.location.href);
      if (leadFormData.userAgent) params.set('user_agent', leadFormData.userAgent);
      
      // Formatted description for Salesforce
      const description = this.formatLeadFormDataForDescription(leadFormData);
      params.set('description', description);
      params.set('notes', description);
      params.set('comments', description);
      
      // Add record parameter for Make.com compatibility
      const recordData = {
        first_name: leadFormData.name || 'Prospect',
        last_name: 'Nevys',
        company: 'Nevy\'s Language Prospect',
        lead_source: 'Arabic Lead Form',
        status: 'New',
        email: leadFormData.email || '',
        phone: leadFormData.phone || '',
        whatsapp_same: leadFormData.whatsappSame || '',
        whatsapp_number: leadFormData.whatsappNumber || '',
        english_lessons_history: leadFormData.englishLessonsHistory || '',
        level_preference: leadFormData.levelPreference || '',
        availability: leadFormData.availability || '',
        specific_time_slot: leadFormData.specificTimeSlot || '',
        state: leadFormData.state || '',
        campaign_name: leadFormData.campaignName || '',
        adset_name: leadFormData.adsetName || '',
        ad_name: leadFormData.adName || '',
        fb_click_id: leadFormData.fbClickId || '',
        submission_date: new Date().toISOString(),
        source_url: window.location.href,
        user_agent: leadFormData.userAgent || '',
        description: description
      };
      
      // Add record parameter as JSON string
      params.set('record', JSON.stringify(recordData));
      
      // Debug logging
      console.log('=== LEAD FORM ZAPIER DEBUG ===');
      console.log('Lead form data being sent:', leadFormData);
      console.log('Description being sent:', description);
      console.log('Full URL being sent:', `${this.LEAD_FORM_WEBHOOK_URL}?${params.toString()}`);
      console.log('All parameters being sent:', params.toString());
      
      // Specific field debugging
      console.log('🔍 LEAD FORM FIELD DEBUG:', {
        'Best Time to Contact': leadFormData.availability,
        'Detailed Call Time': leadFormData.specificTimeSlot,
        'English Level': leadFormData.englishLessonsHistory,
        'Level Preference': leadFormData.levelPreference,
        'State': leadFormData.state,
        'Phone': leadFormData.phone,
        'WhatsApp Same': leadFormData.whatsappSame,
        'WhatsApp Number': leadFormData.whatsappNumber,
        'Campaign Name': leadFormData.campaignName,
        'Adset Name': leadFormData.adsetName,
        'Ad Name': leadFormData.adName,
        'FB Click ID': leadFormData.fbClickId
      });

      // Send as GET request with query parameters (expect plain text)
      const response = await this.http.get(`${this.LEAD_FORM_WEBHOOK_URL}?${params.toString()}`, { responseType: 'text' as const }).toPromise();
      return response;
    } catch (error) {
      console.error('Error sending lead form to Zapier:', error);
      throw error;
    }
  }

  // Send form data to Zapier webhook
  async sendToZapier(formData: FormData): Promise<any> {
    try {
      // Create URL parameters for the webhook
      const params = new URLSearchParams();
      
      // Basic lead information
      params.set('first_name', formData.name || 'Prospect');
      params.set('last_name', 'Nevys');
      params.set('company', 'Nevy\'s Language Prospect');
      params.set('lead_source', 'Website Confirmation Page');
      params.set('status', 'New');
      
      // Appointment status based on user response
      const appointmentStatus = this.getAppointmentStatus(formData.selectedResponse, formData.formSubmitted, formData.formStarted);
      params.set('appointment_status', appointmentStatus);
      
      // Debug appointment status calculation
      console.log('🔍 APPOINTMENT STATUS DEBUG:', {
        selectedResponse: formData.selectedResponse,
        formSubmitted: formData.formSubmitted,
        formStarted: formData.formStarted,
        calculatedStatus: appointmentStatus
      });
      
      // Form responses
      params.set('response_type', formData.selectedResponse);
      
      // Debug form responses
      console.log('🔍 FORM RESPONSES DEBUG:', {
        selectedResponse: formData.selectedResponse,
        cancelReasons: formData.cancelReasons,
        otherReason: formData.otherReason,
        marketingConsent: formData.marketingConsent,
        preferredStartTime: formData.preferredStartTime,
        paymentReadiness: formData.paymentReadiness
      });
      
      // Debug cancel reasons
      console.log('🔍 DEBUG - Cancel reasons in ZapierService:', formData.cancelReasons);
      console.log('🔍 DEBUG - Cancel reasons type:', typeof formData.cancelReasons);
      console.log('🔍 DEBUG - Cancel reasons length:', formData.cancelReasons?.length);
      
      if (formData.cancelReasons && formData.cancelReasons.length > 0) {
        params.set('cancel_reasons', formData.cancelReasons.join(', '));
        console.log('🔍 DEBUG - Setting cancel_reasons to:', formData.cancelReasons.join(', '));
      } else {
        params.set('cancel_reasons', '');
        console.log('🔍 DEBUG - No cancel reasons found, setting to empty string');
      }
      
      if (formData.otherReason) {
        params.set('other_reason', formData.otherReason);
      }
      params.set('marketing_consent', formData.marketingConsent);
      params.set('english_impact', formData.englishImpact);
      params.set('preferred_start_time', formData.preferredStartTime);
      params.set('start_time_preference', formData.preferredStartTime); // Alternative field name
      params.set('projected_start_time', formData.preferredStartTime); // Alternative field name
      params.set('when_to_start', formData.preferredStartTime); // Alternative field name
      params.set('payment_readiness', formData.paymentReadiness);
      params.set('pricing_response', formData.pricingResponse);
      
      // Campaign tracking data
      if (formData.email) params.set('email', formData.email);
      if (formData.campaignName) params.set('campaign_name', formData.campaignName);
      if (formData.adsetName) params.set('adset_name', formData.adsetName);
      if (formData.adName) params.set('ad_name', formData.adName);
      if (formData.fbClickId) params.set('fb_click_id', formData.fbClickId);
      
      // Analytics data
      if (formData.sessionId) params.set('session_id', formData.sessionId);
      if (formData.trigger) params.set('trigger', formData.trigger);
      if (formData.totalSessionTime) params.set('total_session_time', formData.totalSessionTime.toString());
      if (formData.formStarted !== undefined) params.set('form_started', formData.formStarted.toString());
      if (formData.formSubmitted !== undefined) params.set('form_submitted', formData.formSubmitted.toString());
      if (formData.formInteractionTime) params.set('form_interaction_time', formData.formInteractionTime.toString());
      
      // Events data (convert to JSON string for URL parameter)
      if (formData.events) {
        params.set('events', JSON.stringify(formData.events));
      }
      
      // Additional metadata
      params.set('submission_date', new Date().toISOString());
      params.set('source_url', window.location.href);
      if (formData.userAgent) params.set('user_agent', formData.userAgent);
      if (formData.pageUrl) params.set('page_url', formData.pageUrl);
      
      // Formatted description for Salesforce
      const description = formData.description || this.formatFormDataForDescription(formData);
      params.set('description', description);
      params.set('notes', description); // Alternative field name
      params.set('comments', description); // Alternative field name
      
      // Add record parameter for Make.com compatibility
      const recordData = {
        first_name: formData.name || 'Prospect',
        last_name: 'Nevys',
        company: 'Nevy\'s Language Prospect',
        lead_source: 'Website Confirmation Page',
        status: 'New',
        email: formData.email || '',
        appointment_status: this.getAppointmentStatus(formData.selectedResponse, formData.formSubmitted, formData.formStarted),
        response_type: formData.selectedResponse,
        cancel_reasons: formData.cancelReasons?.join(', ') || '',
        marketing_consent: formData.marketingConsent || '',
        english_impact: formData.englishImpact || '',
        preferred_start_time: formData.preferredStartTime || '',
        payment_readiness: formData.paymentReadiness || '',
        pricing_response: formData.pricingResponse || '',
        session_id: formData.sessionId || '',
        trigger: formData.trigger || '',
        form_started: formData.formStarted?.toString() || 'false',
        form_submitted: formData.formSubmitted?.toString() || 'false',
        events: formData.events ? JSON.stringify(formData.events) : '',
        submission_date: new Date().toISOString(),
        source_url: window.location.href,
        user_agent: formData.userAgent || '',
        page_url: formData.pageUrl || '',
        description: description
      };
      
      // Add record parameter as JSON string
      params.set('record', JSON.stringify(recordData));
      
      // Debug logging
      console.log('=== ZAPIER DESCRIPTION DEBUG ===');
      console.log('Description being sent:', description);
      console.log('Description length:', description.length);
      console.log('Full URL being sent:', `${this.CONFIRMATION_WEBHOOK_URL}?${params.toString()}`);
      console.log('🔍 DEBUG - All parameters being sent:', params.toString());

      // Send as GET request with query parameters (expect plain text)
      const response = await this.http.get(`${this.CONFIRMATION_WEBHOOK_URL}?${params.toString()}`, { responseType: 'text' as const }).toPromise();
      return response;
    } catch (error) {
      console.error('Error sending to Zapier:', error);
      throw error;
    }
  }

  // Format lead form data into a readable description
  private formatLeadFormDataForDescription(leadFormData: LeadFormData): string {
    let description = `Arabic Lead Form Submission Details:\n\n`;
    
    description += `Name: ${leadFormData.name || 'Not provided'}\n`;
    description += `Email: ${leadFormData.email || 'Not provided'}\n`;
    description += `Phone: ${leadFormData.phone || 'Not provided'}\n`;
    description += `WhatsApp Same: ${leadFormData.whatsappSame || 'Not provided'}\n`;
    
    if (leadFormData.whatsappSame === 'no' && leadFormData.whatsappNumber) {
      description += `WhatsApp Number: ${leadFormData.whatsappNumber}\n`;
    }
    
    description += `English Lessons History: ${leadFormData.englishLessonsHistory || 'Not provided'}\n`;
    description += `Level Preference: ${leadFormData.levelPreference || 'Not provided'}\n`;
    description += `Best Time to Contact: ${leadFormData.availability || 'Not provided'}\n`;
    description += `Detailed Contact Time: ${leadFormData.specificTimeSlot || 'Not provided'}\n`;
    description += `State: ${leadFormData.state || 'Not provided'}\n`;
    
    // Facebook campaign data
    if (leadFormData.campaignName) {
      description += `\nFacebook Campaign Data:\n`;
      description += `Campaign: ${leadFormData.campaignName}\n`;
      description += `Adset: ${leadFormData.adsetName || 'Not provided'}\n`;
      description += `Ad: ${leadFormData.adName || 'Not provided'}\n`;
      description += `Click ID: ${leadFormData.fbClickId || 'Not provided'}\n`;
    }
    
    description += `\nSubmitted on: ${new Date().toLocaleString()}`;
    
    return description;
  }

  // Format form data into a readable
  private formatFormDataForDescription(formData: FormData): string {
    let description = `Confirmation Page Form Submission Details\n\n`;
    
    // Form responses section
    description += `Response: ${formData.selectedResponse}\n`;
    description += `Appointment Status: ${this.getAppointmentStatus(formData.selectedResponse, formData.formSubmitted, formData.formStarted)}\n\n`;
    
    if (formData.cancelReasons && formData.cancelReasons.length > 0) {
      description += `Cancel Reasons: ${formData.cancelReasons.join(', ')}\n\n`;
    }
    
    if (formData.otherReason) {
      description += `Other Reason Details: ${formData.otherReason}\n\n`;
    }
    
    if (formData.marketingConsent) {
      description += `Marketing Consent: ${formData.marketingConsent}\n\n`;
    }
    
    if (formData.englishImpact) {
      description += `English Impact Level: ${formData.englishImpact}\n\n`;
    }
    
    if (formData.preferredStartTime) {
      description += `Projected Time to Start Classes: ${formData.preferredStartTime}\n\n`;
    }
    
    if (formData.paymentReadiness) {
      description += `Payment Readiness: ${formData.paymentReadiness}\n\n`;
    }
    
    if (formData.pricingResponse) {
      description += `Pricing Feedback: ${formData.pricingResponse}\n\n`;
    }
    
    // Contact information section
    if (formData.name || formData.email) {
      description += `Contact Information:\n`;
      if (formData.name) {
        description += `Name: ${formData.name}\n`;
      }
      if (formData.email) {
        description += `Email: ${formData.email}\n`;
      }
      description += `\n`;
    }
    
    // Campaign tracking section
    if (formData.campaignName || formData.adsetName || formData.adName) {
      description += `Campaign Tracking:\n`;
      if (formData.campaignName) {
        description += `Campaign: ${formData.campaignName}\n`;
      }
      if (formData.adsetName) {
        description += `Adset: ${formData.adsetName}\n`;
      }
      if (formData.adName) {
        description += `Ad: ${formData.adName}\n`;
      }
      description += `\n`;
    }
    
    // Analytics data section
    description += `Analytics Data:\n`;
    if (formData.sessionId) {
      description += `Session ID: ${formData.sessionId}\n`;
    }
    
    if (formData.totalSessionTime) {
      description += `Total Session Time: ${this.formatTime(formData.totalSessionTime)}\n`;
    }
    
    if (formData.formInteractionTime) {
      description += `Form Interaction Time: ${this.formatTime(formData.formInteractionTime)}\n`;
    }
    
    if (formData.events) {
      description += `\nAnalytics Events:\n`;
      Object.keys(formData.events).forEach(key => {
        const readableKey = this.getReadableEventName(key);
        const value = formData.events[key];
        // Format time-related fields with mm:ss format, keep boolean values as is
        const formattedValue = this.isTimeField(key) ? this.formatTime(value) : value;
        description += `• ${readableKey}: ${formattedValue}\n`;
      });
    }
    
    description += `\nSubmitted on: ${new Date().toLocaleString()}`;
    
    return description;
  }

  // Convert technical event names to readable format for description only
  private getReadableEventName(technicalName: string): string {
    const readableNames: { [key: string]: string } = {
      'session_duration_on_price_section': 'Time spent on Price Section',
      'session_duration_on_levels_section': 'Time spent on Levels Section',
      'session_duration_on_teachers_section': 'Time spent on Teachers Section',
      'session_duration_on_platform_section': 'Time spent on Platform Section',
      'session_duration_on_advisors_section': 'Time spent on Advisors Section',
      'session_duration_on_testimonials_section': 'Time spent on Testimonials Section',
      'session_duration_on_form_section': 'Time spent on Form Section',
      'session_idle_time_duration': 'Total Idle Time',
      'form_started': 'Form Started',
      'form_submitted': 'Form Submitted',
      'form_interaction_time': 'Form Interaction Time'
    };
    
    return readableNames[technicalName] || technicalName;
  }

  // Check if a field is time-related and should have "Seconds" appended
  private isTimeField(fieldName: string): boolean {
    const timeFields = [
      'session_duration_on_price_section',
      'session_duration_on_levels_section',
      'session_duration_on_teachers_section',
      'session_duration_on_platform_section',
      'session_duration_on_advisors_section',
      'session_duration_on_testimonials_section',
      'session_duration_on_form_section',
      'session_idle_time_duration',
      'form_interaction_time'
    ];
    
    return timeFields.includes(fieldName);
  }

  // Format time in seconds to mm:ss format
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Get appointment status based on user response (using same logic as confirmation page)
  private getAppointmentStatus(selectedResponse: string, formSubmitted?: boolean, formStarted?: boolean): string {
    // If form was not started at all, return empty
    if (formStarted === false) {
      return '';
    }
    
    // If form was started but not submitted, return specific status
    if (formStarted === true && formSubmitted === false) {
      switch (selectedResponse) {
        case 'Confirm Interest':
          return 'Started Confirming but dropped out';
        case 'Cancel':
          return 'Started Cancelling but dropped out';
        default:
          return '';
      }
    }
    
    // If form was submitted, return final status
    if (formSubmitted === true) {
      switch (selectedResponse) {
        case 'Confirm Interest':
          return 'Confirmed';
        case 'Cancel':
          return 'Cancelled';
        default:
          return '';
      }
    }
    
    return '';
  }
}
