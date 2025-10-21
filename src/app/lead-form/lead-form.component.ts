import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { COUNTRIES, Country } from '.././countries';
import { getMaxDigitsForCountry } from '.././country-digit-limits';
import { ZapierService, LeadFormData } from '../services/zapier.service';

@Component({
  selector: 'app-lead-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, HttpClientModule],
  templateUrl: './lead-form.component.html',
  styleUrl: './lead-form.component.css'
})
export class LeadFormComponent implements OnInit {
  
  title = 'arableadform';
  leadForm: FormGroup;
  selectedTimeSlots: any[] = [];
  selectedCountryCode = '+1';
  selectedWhatsAppCountryCode = '+963';
  showCountryDropdown = false;
  showWhatsAppCountryDropdown = false;
  countrySearchTerm = '';
  whatsappCountrySearchTerm = '';
  filteredCountries: any[] = [];
  filteredWhatsAppCountries: any[] = [];

  // State dropdown properties
  showStateDropdown = false;
  stateSearchTerm = '';
  filteredStates: any[] = [];
  selectedState = '';

  countryCodes: Country[] = COUNTRIES;

  // Verification page
  showVerificationPage: boolean = false;

  // US States data
  usStates = [
    { value: 'Alabama', label: 'Alabama' },
    { value: 'Alaska', label: 'Alaska' },
    { value: 'Arizona', label: 'Arizona' },
    { value: 'Arkansas', label: 'Arkansas' },
    { value: 'California', label: 'California' },
    { value: 'Colorado', label: 'Colorado' },
    { value: 'Connecticut', label: 'Connecticut' },
    { value: 'Delaware', label: 'Delaware' },
    { value: 'Florida', label: 'Florida' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Hawaii', label: 'Hawaii' },
    { value: 'Idaho', label: 'Idaho' },
    { value: 'Illinois', label: 'Illinois' },
    { value: 'Indiana', label: 'Indiana' },
    { value: 'Iowa', label: 'Iowa' },
    { value: 'Kansas', label: 'Kansas' },
    { value: 'Kentucky', label: 'Kentucky' },
    { value: 'Louisiana', label: 'Louisiana' },
    { value: 'Maine', label: 'Maine' },
    { value: 'Maryland', label: 'Maryland' },
    { value: 'Massachusetts', label: 'Massachusetts' },
    { value: 'Michigan', label: 'Michigan' },
    { value: 'Minnesota', label: 'Minnesota' },
    { value: 'Mississippi', label: 'Mississippi' },
    { value: 'Missouri', label: 'Missouri' },
    { value: 'Montana', label: 'Montana' },
    { value: 'Nebraska', label: 'Nebraska' },
    { value: 'Nevada', label: 'Nevada' },
    { value: 'New Hampshire', label: 'New Hampshire' },
    { value: 'New Jersey', label: 'New Jersey' },
    { value: 'New Mexico', label: 'New Mexico' },
    { value: 'New York', label: 'New York' },
    { value: 'North Carolina', label: 'North Carolina' },
    { value: 'North Dakota', label: 'North Dakota' },
    { value: 'Ohio', label: 'Ohio' },
    { value: 'Oklahoma', label: 'Oklahoma' },
    { value: 'Oregon', label: 'Oregon' },
    { value: 'Pennsylvania', label: 'Pennsylvania' },
    { value: 'Rhode Island', label: 'Rhode Island' },
    { value: 'South Carolina', label: 'South Carolina' },
    { value: 'South Dakota', label: 'South Dakota' },
    { value: 'Tennessee', label: 'Tennessee' },
    { value: 'Texas', label: 'Texas' },
    { value: 'Utah', label: 'Utah' },
    { value: 'Vermont', label: 'Vermont' },
    { value: 'Virginia', label: 'Virginia' },
    { value: 'Washington', label: 'Washington' },
    { value: 'West Virginia', label: 'West Virginia' },
    { value: 'Wisconsin', label: 'Wisconsin' },
    { value: 'Wyoming', label: 'Wyoming' },
    { value: 'District of Columbia', label: 'District of Columbia' }
  ];

  timeSlots = {
    '9am-11am': [
      { value: '9:00-9:30', label: '9:00 - 9:30 صباحًا' },
      { value: '9:30-10:00', label: '9:30 - 10:00 صباحًا' },
      { value: '10:30-11:00', label: '10:30 - 11:00 صباحًا' },
      { value: '10:00-10:30', label: '10:00 - 10:30 صباحًا' }
    ],
    '11am-2pm': [
      { value: '11:00-11:30', label: '11:00 - 11:30 صباحًا' },
      { value: '11:30-12:00', label: '11:30 - 12:00 ظهرًا' },
      { value: '12:30-1:00', label: '12:30 - 1:00 ظهرًا' },
      { value: '12:00-12:30', label: '12:00 - 12:30 ظهرًا' },
      { value: '1:30-2:00', label: '1:30 - 2:00 ظهرًا' },
      { value: '1:00-1:30', label: '1:00 - 1:30 ظهرًا' }
    ],
    '2pm-5pm': [
      { value: '2:30-3:00', label: '2:30 - 3:00 مساءً' },
      { value: '2:00-2:30', label: '2:00 - 2:30 مساءً' },
      { value: '3:30-4:00', label: '3:30 - 4:00 مساءً' },
      { value: '3:00-3:30', label: '3:00 - 3:30 مساءً' },
      { value: '4:30-5:00', label: '4:30 - 5:00 مساءً' },
      { value: '4:00-4:30', label: '4:00 - 4:30 مساءً' }
    ],
    '5pm-9pm': [
      { value: '5:30-6:00', label: '5:30 - 6:00 مساءً' },
      { value: '5:00-5:30', label: '5:00 - 5:30 مساءً' },
      { value: '6:30-7:00', label: '6:30 - 7:00 مساءً' },
      { value: '6:00-6:30', label: '6:00 - 6:30 مساءً' },
      { value: '7:30-8:00', label: '7:30 - 8:00 مساءً' },
      { value: '7:00-7:30', label: '7:00 - 7:30 مساءً' },
      { value: '8:30-9:00', label: '8:30 - 9:00 مساءً' },
      { value: '8:00-8:30', label: '8:00 - 8:30 مساءً' }
    ]
  };

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router, private zapierService: ZapierService) {
    this.leadForm = this.fb.group({
      englishLessonsHistory: ['', Validators.required],
      levelPreference: ['', Validators.required],
      availability: ['', Validators.required],
      specificTimeSlot: ['', Validators.required],
      name: ['', Validators.required],
      phone: ['', [Validators.required, this.usPhoneValidator]],
      whatsappSame: ['', Validators.required],
      whatsappNumber: [''],
      email: ['', [Validators.required, Validators.email, this.emailValidator]],
      state: ['', Validators.required],
      campaignName: [''],
      adsetName: [''],
      adName: [''],
      fbClickId: ['']
    });

   //changes in availability to update time slots
    this.leadForm.get('availability')?.valueChanges.subscribe(value => {
      this.updateTimeSlots(value);
      console.log("Time slot value,,....", value);
      
      // Reset specific time slot when availability changes
      this.leadForm.get('specificTimeSlot')?.setValue('');
    });

    // Listen for changes in WhatsApp same as phone to update validation
    this.leadForm.get('whatsappSame')?.valueChanges.subscribe(value => {
      this.updateWhatsAppValidation(value);
    });
  }

  ngOnInit() {
    this.extractUrlParameters();
    // Ensure the country code display is properly initialized
    this.selectedCountryCode = '+1'; // Default to US/Canada
  }

  extractUrlParameters() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Extract Facebook campaign parameters
    const campaignName = urlParams.get('Campaign_name') || urlParams.get('campaign_name') || '';
    const adsetName = urlParams.get('Adset_name') || urlParams.get('adset_name') || '';
    const adName = urlParams.get('Ad_name') || urlParams.get('ad_name') || '';
    const fbClickId = urlParams.get('fbclid') || '';
    
    // Auto-populate the hidden form fields
    this.leadForm.patchValue({
      campaignName: campaignName,
      adsetName: adsetName,
      adName: adName,
      fbClickId: fbClickId
    });
    
    // Log for debugging (remove in production)
    console.log('Facebook Campaign Parameters:', {
      campaignName,
      adsetName,
      adName,
      fbClickId
    });
  }

  updateTimeSlots(availability: string) {
    if (availability && this.timeSlots[availability as keyof typeof this.timeSlots]) {
      this.selectedTimeSlots = this.timeSlots[availability as keyof typeof this.timeSlots];
    } else {
      this.selectedTimeSlots = [];
    }
  }

  updateWhatsAppValidation(whatsappSame: string) {
    const whatsappNumberControl = this.leadForm.get('whatsappNumber');
    if (whatsappSame === 'no') {
      // If WhatsApp is different
      whatsappNumberControl?.setValidators([Validators.required]);
      whatsappNumberControl?.updateValueAndValidity();
    } else {
      // If WhatsApp is same
      whatsappNumberControl?.setValue('');
      whatsappNumberControl?.clearValidators();
      whatsappNumberControl?.updateValueAndValidity();
    }
  }

  onSubmit() {
    // Mark all fields as touched to show validation errors
    this.markAllFieldsAsTouched();
    
    if (this.leadForm.valid) {
      console.log('Form submitted:', this.leadForm.value);
      
      // Directly submit the form since verification popup is commented out
      this.sendToZapier(this.leadForm.value);
      
    } else {
      console.log('Form is invalid');
      // Don't show alert, validation errors will be displayed below fields
    }
  }

  // Mark all form fields as touched to trigger validation display
  markAllFieldsAsTouched() {
    Object.keys(this.leadForm.controls).forEach(key => {
      const control = this.leadForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  async sendToZapier(formData: any) {
    try {
      // Prepare lead form data for ZapierService with full international phone numbers
      const leadFormData: LeadFormData = {
        englishLessonsHistory: formData.englishLessonsHistory || '',
        levelPreference: formData.levelPreference || '',
        availability: formData.availability || '',
        specificTimeSlot: formData.specificTimeSlot || '',
        name: formData.name || '',
        phone: this.getFullPhoneNumber(), // Include country code
        whatsappSame: formData.whatsappSame || '',
        whatsappNumber: formData.whatsappSame === 'no' ? this.getFullWhatsAppNumber() : undefined,
        email: formData.email || '',
        state: formData.state || '',
        campaignName: formData.campaignName || '',
        adsetName: formData.adsetName || '',
        adName: formData.adName || '',
        fbClickId: formData.fbClickId || '',
        submissionDate: new Date().toISOString(),
        sourceUrl: window.location.href,
        userAgent: navigator.userAgent
      };

      console.log('Sending lead form data via ZapierService:', leadFormData);
      
      // Debug specific fields that might be missing
      console.log('🔍 LEAD FORM DATA DEBUG:', {
        'Raw Form Data': formData,
        'Availability (Best Time)': formData.availability,
        'Specific Time Slot (Detailed Call Time)': formData.specificTimeSlot,
        'English Lessons History': formData.englishLessonsHistory,
        'Level Preference': formData.levelPreference,
        'State': formData.state,
        'Phone': this.getFullPhoneNumber(),
        'WhatsApp Same': formData.whatsappSame,
        'WhatsApp Number': formData.whatsappSame === 'no' ? this.getFullWhatsAppNumber() : 'Same as phone'
        // Campaign tracking data removed - only sent in confirmation page
      });
      
      // Send to Zapier webhook using ZapierService
      await this.zapierService.sendLeadFormToZapier(leadFormData);
      
      console.log('Lead form data successfully sent to webhook');
      
      // Navigate to confirmation page after successful submission
      this.navigateToConfirmation(formData);
      
    } catch (error) {
      console.error('Error sending lead form to webhook:', error);
      
      // Still navigate to confirmation page even if webhook fails
      // This ensures the user experience isn't broken
      this.navigateToConfirmation(formData);
    }
  }

  // Navigate to confirmation page with parameters
  navigateToConfirmation(formData: any) {
    const queryParams = {
      name: formData.name || '',
      email: formData.email || '',
      Campaign_name: formData.campaignName || '',
      Adset_name: formData.adsetName || '',
      Ad_name: formData.adName || '',
      fbclid: formData.fbClickId || ''
    };
    
    console.log('Navigating to confirmation page with params:', queryParams);
    
    this.router.navigate(['/confirmation'], { queryParams });
  }

  // Verification page methods
  closeVerificationPage() {
    this.showVerificationPage = false;
    document.body.style.overflow = 'auto';
  }

  async confirmSubmission() {
    // Get form values
    const formData = this.leadForm.value;
    
    // Close verification page
    this.closeVerificationPage();
    
    // Send data to Zapier webhook
    await this.sendToZapier(formData);
  }

  editForm() {
    // Close verification page and allow editing
    this.closeVerificationPage();
  }


  // Format form data into a readable description (matching successful pattern)
  private formatFormDataForDescription(formData: any): string {
    let description = `Arabic Lead Form Submission Details:\n\n`;
    
    description += `Name: ${formData.name || 'Not provided'}\n`;
    description += `Email: ${formData.email || 'Not provided'}\n`;
    description += `Phone: ${this.getFullPhoneNumber() || 'Not provided'}\n`;
    description += `WhatsApp Same: ${formData.whatsappSame || 'Not provided'}\n`;
    
    if (formData.whatsappSame === 'no') {
      description += `WhatsApp Number: ${this.getFullWhatsAppNumber()}\n`;
    } else {
      description += `WhatsApp Number: ${this.getFullPhoneNumber()} (Same as phone)\n`;
    }
    
    description += `English Lessons History: ${formData.englishLessonsHistory || 'Not provided'}\n`;
    description += `Level Preference: ${formData.levelPreference || 'Not provided'}\n`;
    description += `Best Time to Contact: ${formData.availability || 'Not provided'}\n`;
    description += `Detailed Contact Time: ${formData.specificTimeSlot || 'Not provided'}\n`;
    description += `State: ${formData.state || 'Not provided'}\n`;
    
    // Facebook campaign data
    if (formData.campaignName) {
      description += `\nFacebook Campaign Data:\n`;
      description += `Campaign: ${formData.campaignName}\n`;
      description += `Adset: ${formData.adsetName || 'Not provided'}\n`;
      description += `Ad: ${formData.adName || 'Not provided'}\n`;
      description += `Click ID: ${formData.fbClickId || 'Not provided'}\n`;
    }
    
    description += `\nSubmitted on: ${new Date().toLocaleString()}`;
    
    return description;
  }

  // Email validator
  emailValidator(control: any) {
    if (!control.value) {
      return null;
    }
    
    const email = control.value.trim();
    
    // Basic email regex pattern
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Check for common invalid patterns
    const invalidPatterns = [
      /^[^@]*$/, // No @ symbol
      /@[^.]*$/, // No dot after @
      /^@/, // Starts with @
      /@$/, // Ends with @
      /\.{2,}/, // Multiple consecutive dots
      /^\./, // Starts with dot
      /\.$/, // Ends with dot
      /@.*@/, // Multiple @ symbols
      /\s/ // Contains spaces
    ];
    
    // Check if email matches basic pattern
    if (!emailPattern.test(email)) {
      return { invalidEmail: true };
    }
    
    // Check for invalid patterns
    for (const pattern of invalidPatterns) {
      if (pattern.test(email)) {
        return { invalidEmail: true };
      }
    }
    
    // Check for common disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
      'temp-mail.org', 'throwaway.email', 'getnada.com', 'maildrop.cc'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) {
      return { invalidEmail: true };
    }
    
    return null; // Valid email
  }

  // US phone number validator
  usPhoneValidator(control: any) {
    if (!control.value) {
      return null;
    }
    
    // Remove all non-digit characters
    const phoneNumber = control.value.replace(/\D/g, '');
    
    // US phone numbers should be 10 digits (without country code)
    if (phoneNumber.length === 10) {
      // Check if it starts with valid US area codes (2-9 for first digit, 0-9 for second and third)
      const areaCode = phoneNumber.substring(0, 3);
      const firstDigit = areaCode.charAt(0);
      
      // US area codes: first digit must be 2-9, second and third can be 0-9
      // But cannot be 000, 111, 222, etc. (though some are valid, we'll be more lenient)
      if (firstDigit >= '2' && firstDigit <= '9') {
        return null; // Valid US phone number
      }
    }
    
    return { invalidUSPhone: true };
  }

  // Format phone number as user types
  formatPhoneNumber(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    
    // Limit to 10 digits (US phone number without country code)
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    
    // Format as (xxx) xxx-xxxx (without +1 prefix in the input field)
    if (value.length === 0) {
      value = '';
    } else if (value.length <= 3) {
      value = `(${value}`;
    } else if (value.length <= 6) {
      value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
    } else {
      value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6, 10)}`;
    }
    
    this.leadForm.get('phone')?.setValue(value, { emitEvent: false });
  }

  // Format WhatsApp number as user types
  formatWhatsAppNumber(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    
    // Get the maximum allowed digits for the selected WhatsApp country
    const maxDigits = this.getMaxDigitsForCountry(this.selectedWhatsAppCountryCode);
    
    // Limit to the maximum allowed digits for the selected country
    if (value.length > maxDigits) {
      value = value.substring(0, maxDigits);
    }
    
    // Format based on WhatsApp country code
    value = this.formatNumberByCountry(value, this.selectedWhatsAppCountryCode);
    
    this.leadForm.get('whatsappNumber')?.setValue(value, { emitEvent: false });
  }

  // Format number based on country code
  formatNumberByCountry(number: string, countryCode: string): string {
    if (!number) return '';
    
    // US/Canada (+1) - format as (xxx) xxx-xxxx
    if (countryCode === '+1') {
      if (number.length === 0) return '';
      if (number.length <= 3) return `(${number}`;
      if (number.length <= 6) return `(${number.substring(0, 3)}) ${number.substring(3)}`;
      return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6, 10)}`;
    }
    
    // UK (+44) - format as xxxx xxx xxxx
    if (countryCode === '+44') {
      if (number.length <= 4) return number;
      if (number.length <= 7) return `${number.substring(0, 4)} ${number.substring(4)}`;
      return `${number.substring(0, 4)} ${number.substring(4, 7)} ${number.substring(7, 11)}`;
    }
    
    // Germany (+49) - format as xxx xxxxxxx
    if (countryCode === '+49') {
      if (number.length <= 3) return number;
      return `${number.substring(0, 3)} ${number.substring(3, 10)}`;
    }
    
    // France (+33) - format as x xx xx xx xx
    if (countryCode === '+33') {
      if (number.length <= 1) return number;
      if (number.length <= 3) return `${number.substring(0, 1)} ${number.substring(1)}`;
      if (number.length <= 5) return `${number.substring(0, 1)} ${number.substring(1, 3)} ${number.substring(3)}`;
      if (number.length <= 7) return `${number.substring(0, 1)} ${number.substring(1, 3)} ${number.substring(3, 5)} ${number.substring(5)}`;
      return `${number.substring(0, 1)} ${number.substring(1, 3)} ${number.substring(3, 5)} ${number.substring(5, 7)} ${number.substring(7, 9)}`;
    }
    
    // Syria (+963) - format as xxx xxx xxxx
    if (countryCode === '+963') {
      if (number.length <= 3) return number;
      if (number.length <= 6) return `${number.substring(0, 3)} ${number.substring(3)}`;
      return `${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6, 10)}`;
    }
    
    // Saudi Arabia (+966) - format as xxx xxx xxxx
    if (countryCode === '+966') {
      if (number.length <= 3) return number;
      if (number.length <= 6) return `${number.substring(0, 3)} ${number.substring(3)}`;
      return `${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6, 10)}`;
    }
    
    // UAE (+971) - format as xxx xxx xxxx
    if (countryCode === '+971') {
      if (number.length <= 3) return number;
      if (number.length <= 6) return `${number.substring(0, 3)} ${number.substring(3)}`;
      return `${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6, 10)}`;
    }
    
    // Egypt (+20) - format as xxx xxx xxxx
    if (countryCode === '+20') {
      if (number.length <= 3) return number;
      if (number.length <= 6) return `${number.substring(0, 3)} ${number.substring(3)}`;
      return `${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6, 10)}`;
    }
    
    // Default formatting for other countries - add spaces every 3 digits
    if (number.length <= 3) return number;
    if (number.length <= 6) return `${number.substring(0, 3)} ${number.substring(3)}`;
    return `${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
  }

  // Get maximum number of digits allowed for each country code
  getMaxDigitsForCountry(countryCode: string): number {
    return getMaxDigitsForCountry(countryCode);
  }

  // Get full phone number with country code
  getFullPhoneNumber(): string {
    const countryCode = this.selectedCountryCode;
    const number = this.leadForm.get('phone')?.value || '';
    return countryCode + ' ' + number;
  }

  // Get full WhatsApp number with country code
  getFullWhatsAppNumber(): string {
    const countryCode = this.selectedWhatsAppCountryCode;
    const number = this.leadForm.get('whatsappNumber')?.value || '';
    return countryCode + ' ' + number;
  }

  // Get formatted WhatsApp number for display
  getFormattedWhatsAppDisplay(): string {
    const countryCode = this.selectedWhatsAppCountryCode;
    const number = this.leadForm.get('whatsappNumber')?.value || '';
    if (!number) {
      return 'رقم الهاتف';
    }
    return countryCode + ' ' + number;
  }

  // Format phone number for submission (ensure it's in +1 (xxx) xxx-xxxx format)
  formatPhoneForSubmission(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it's 11 digits and starts with 1, format it
    if (digits.length === 11 && digits.startsWith('1')) {
      const areaCode = digits.substring(1, 4);
      const firstPart = digits.substring(4, 7);
      const secondPart = digits.substring(7, 11);
      return `+1 (${areaCode}) ${firstPart}-${secondPart}`;
    }
    
    // If it's 10 digits, add the country code and format
    if (digits.length === 10) {
      const areaCode = digits.substring(0, 3);
      const firstPart = digits.substring(3, 6);
      const secondPart = digits.substring(6, 10);
      return `+1 (${areaCode}) ${firstPart}-${secondPart}`;
    }
    
    // Return as is if it doesn't match expected patterns
    return phone;
  }

  // Format email (trim and lowercase)
  formatEmail(event: any) {
    const email = event.target.value.trim().toLowerCase();
    this.leadForm.get('email')?.setValue(email, { emitEvent: false });
  }

  // Get the flag for the selected country code
  getSelectedCountryFlag(): string {
    const selectedCountry = this.countryCodes.find(country => country.code === this.selectedCountryCode);
    return selectedCountry ? selectedCountry.flag : '🇺🇸';
  }

  // Get the flag for the selected WhatsApp country code
  getSelectedWhatsAppCountryFlag(): string {
    const selectedCountry = this.countryCodes.find(country => country.code === this.selectedWhatsAppCountryCode);
    return selectedCountry ? selectedCountry.flag : '🇸🇾';
  }

  // Toggle country dropdown
  toggleCountryDropdown() {
    this.showCountryDropdown = !this.showCountryDropdown;
    if (this.showCountryDropdown) {
      this.filteredCountries = [...this.countryCodes];
      this.countrySearchTerm = '';
    }
    console.log('Dropdown toggled, showCountryDropdown:', this.showCountryDropdown);
  }

  // Toggle WhatsApp country dropdown
  toggleWhatsAppCountryDropdown() {
    this.showWhatsAppCountryDropdown = !this.showWhatsAppCountryDropdown;
    if (this.showWhatsAppCountryDropdown) {
      this.filteredWhatsAppCountries = [...this.countryCodes];
      this.whatsappCountrySearchTerm = '';
    }
    console.log('WhatsApp dropdown toggled, showWhatsAppCountryDropdown:', this.showWhatsAppCountryDropdown);
  }

  // Select a country
  selectCountry(country: any) {
    this.selectedCountryCode = country.code;
    this.showCountryDropdown = false;
    this.countrySearchTerm = '';
    
    // Re-format WhatsApp number if it exists and exceeds the new country's limit
    const currentWhatsAppNumber = this.leadForm.get('whatsappNumber')?.value || '';
    if (currentWhatsAppNumber) {
      const digits = currentWhatsAppNumber.replace(/\D/g, '');
      const maxDigits = this.getMaxDigitsForCountry(country.code);
      
      if (digits.length > maxDigits) {
        const trimmedDigits = digits.substring(0, maxDigits);
        this.leadForm.get('whatsappNumber')?.setValue(trimmedDigits, { emitEvent: false });
      }
    }
    
    console.log('Country selected:', country);
  }

  // Select a WhatsApp country
  selectWhatsAppCountry(country: any) {
    this.selectedWhatsAppCountryCode = country.code;
    this.showWhatsAppCountryDropdown = false;
    this.whatsappCountrySearchTerm = '';
    
    // Re-format WhatsApp number if it exists and exceeds the new country's limit
    const currentWhatsAppNumber = this.leadForm.get('whatsappNumber')?.value || '';
    if (currentWhatsAppNumber) {
      const digits = currentWhatsAppNumber.replace(/\D/g, '');
      const maxDigits = this.getMaxDigitsForCountry(country.code);
      
      if (digits.length > maxDigits) {
        const trimmedDigits = digits.substring(0, maxDigits);
        this.leadForm.get('whatsappNumber')?.setValue(trimmedDigits, { emitEvent: false });
      }
    }
    
    console.log('WhatsApp country selected:', country);
  }

  // Filter countries based on search term - optimized for speed
  filterCountries() {
    const searchTerm = this.countrySearchTerm?.trim() || '';
    
    // If search is empty, show all countries immediately
    if (!searchTerm) {
      this.filteredCountries = [...this.countryCodes];
      return;
    }
    
    // Fast filtering with lowercase search term
    const lowerSearchTerm = searchTerm.toLowerCase();
    this.filteredCountries = this.countryCodes.filter(country => 
      country.country.toLowerCase().includes(lowerSearchTerm) ||
      country.code.includes(searchTerm) ||
      country.flag.includes(searchTerm)
    );
  }

  // Handle search input with real-time filtering
  onCountrySearch(event: any) {
    this.countrySearchTerm = event.target.value;
    // Immediate filtering for fast response
    this.filterCountries();
  }

  // Handle when search input is cleared
  onSearchClear() {
    this.countrySearchTerm = '';
    this.filterCountries();
  }

  // Filter WhatsApp countries based on search term
  filterWhatsAppCountries() {
    const searchTerm = this.whatsappCountrySearchTerm?.trim() || '';
    
    // If search is empty, show all countries immediately
    if (!searchTerm) {
      this.filteredWhatsAppCountries = [...this.countryCodes];
      return;
    }
    
    // Fast filtering with lowercase search term
    const lowerSearchTerm = searchTerm.toLowerCase();
    this.filteredWhatsAppCountries = this.countryCodes.filter(country => 
      country.country.toLowerCase().includes(lowerSearchTerm) ||
      country.code.includes(searchTerm) ||
      country.flag.includes(searchTerm)
    );
  }

  // Handle WhatsApp country search input with real-time filtering
  onWhatsAppCountrySearch(event: any) {
    this.whatsappCountrySearchTerm = event.target.value;
    // Immediate filtering for fast response
    this.filterWhatsAppCountries();
  }

  // Handle when WhatsApp search input is cleared
  onWhatsAppSearchClear() {
    this.whatsappCountrySearchTerm = '';
    this.filterWhatsAppCountries();
  }

  // Handle country code change (legacy method)
  onCountryCodeChange() {
    // This method is called when the country code dropdown changes
    // The flag and country code will automatically update due to two-way binding
    console.log('Country code changed to:', this.selectedCountryCode);
  }

  // State dropdown methods
  toggleStateDropdown() {
    this.showStateDropdown = !this.showStateDropdown;
    if (this.showStateDropdown) {
      this.filteredStates = [...this.usStates];
      this.stateSearchTerm = '';
    }
  }

  selectState(state: any) {
    this.selectedState = state.value;
    this.leadForm.get('state')?.setValue(state.value);
    this.showStateDropdown = false;
    this.stateSearchTerm = '';
    this.leadForm.get('state')?.markAsTouched();
  }

  onStateSearch(event: any) {
    this.stateSearchTerm = event.target.value;
    this.filterStates();
  }

  filterStates() {
    const searchTerm = this.stateSearchTerm?.trim() || '';
    
    if (!searchTerm) {
      this.filteredStates = [...this.usStates];
      return;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    this.filteredStates = this.usStates.filter(state => 
      state.label.toLowerCase().includes(lowerSearchTerm) ||
      state.value.toLowerCase().includes(lowerSearchTerm)
    );
  }

  onStateSearchClear() {
    this.stateSearchTerm = '';
    this.filterStates();
  }

  getSelectedStateDisplay(): string {
    if (!this.selectedState) {
      return '...Select ✓';
    }
    const state = this.usStates.find(s => s.value === this.selectedState);
    return state ? state.label : this.selectedState;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.whatsapp-prefix-container')) {
      this.showCountryDropdown = false;
    }
    if (!target.closest('.whatsapp-country-prefix-container')) {
      this.showWhatsAppCountryDropdown = false;
    }
    if (!target.closest('.state-dropdown-container')) {
      this.showStateDropdown = false;
    }
  }

  // Check if form is valid for submit button styling
  isFormValid(): boolean {
    return this.leadForm.valid;
  }

  // Get validation errors for display
  getFieldErrors(fieldName: string): string[] {
    const field = this.leadForm.get(fieldName);
    const errors: string[] = [];
    
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        errors.push('هذا الحقل مطلوب');
      }
      if (field.errors?.['email']) {
        errors.push('يرجى إدخال بريد إلكتروني صحيح');
      }
      if (field.errors?.['invalidEmail']) {
        errors.push('يرجى إدخال بريد إلكتروني صحيح');
      }
      if (field.errors?.['invalidUSPhone']) {
        errors.push('يرجى إدخال رقم هاتف أمريكي صحيح');
      }
    }
    
    return errors;
  }

  // Check if field has errors
  hasFieldErrors(fieldName: string): boolean {
    return this.getFieldErrors(fieldName).length > 0;
  }
}
