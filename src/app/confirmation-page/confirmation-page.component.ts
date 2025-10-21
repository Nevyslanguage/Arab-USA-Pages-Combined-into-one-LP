import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ZapierService, FormData } from '../services/zapier.service';

@Component({
  selector: 'app-confirmation-page',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './confirmation-page.component.html',
  styleUrl: './confirmation-page.component.css'
})
export class ConfirmationPageComponent implements OnInit, OnDestroy {
  // Development flag to disable Zapier calls during development
  private readonly isDevelopment = false; // Disabled to allow localhost testing
  
  constructor(private zapierService: ZapierService) {}
  selectedChoice: string = '';
  currentSlide: number = 0;
  slides = [0, 1, 2, 3]; // Four review images
  
  // Form selections
  selectedCancellationReasons: string[] = [];
  selectedSubscription: string = '';
  selectedStartTime: string = '';
  selectedPayment: string = '';
  otherCancellationReason: string = '';

  // Modal properties
  showModal: boolean = false;
  modalImageSrc: string = '';
  zoomLevel: number = 1;
  panX: number = 0;
  panY: number = 0;
  isDragging: boolean = false;
  lastMouseX: number = 0;
  lastMouseY: number = 0;
  
  // Touch properties
  isTouching: boolean = false;
  lastTouchX: number = 0;
  lastTouchY: number = 0;
  initialTouchDistance: number = 0;
  initialZoomLevel: number = 1;

  // Pricing section timer
  showPricingPopup: boolean = false;
  private pricingTimer: any;
  private pricingStartTime: number = 0;
  private pricingEndTime: number = 0;
  private totalPricingTime: number = 0;
  private hasShownPricingPopup: boolean = false;
  private pricingSectionVisible: boolean = false;
  
  // Pricing time validation dialog
  showPricingTimeValidation: boolean = false;
  
  // User tracking system
  private sessionId: string = '';
  private sessionStartTime: number = 0;
  private sectionTimers: { [key: string]: { totalTime: number; isActive: boolean; currentSessionStart?: number } } = {};
  private idleTime: { total: number; lastActivity: number; isIdle: boolean; idleThreshold: number; popupShownAt?: number } = {
    total: 0,
    lastActivity: 0,
    isIdle: false,
    idleThreshold: 90000 // 90 seconds total inactivity
  };
  private idleTimer: any = null;
  private idlePopupTimer: any = null;
  
  // Form interaction tracking
  private formStarted: boolean = false;
  private formSubmitted: boolean = false;
  private formStartTime: number = 0;
  
  // URL parameters from leadform
  private urlParams: {
    email?: string;
    name?: string;
    campaignName?: string;
    adsetName?: string;
    adName?: string;
    fbClickId?: string;
  } = {};
  
  // Section to event mapping
  private sectionEvents: { [key: string]: string } = {
    '#pricing-section': 'session_duration_on_price_section',
    '#levels-section': 'session_duration_on_levels_section',
    '#teachers-section': 'session_duration_on_teachers_section',
    '#platform-section': 'session_duration_on_platform_section',
    '#consultants-section': 'session_duration_on_advisors_section',
    '#carousel-section': 'session_duration_on_testimonials_section',
    '#form-section': 'session_duration_on_form_section'
  };
  
  // Plan selection data
  selectedPlan: string = '';
  planSelectionData: any = {
    plan: '',
    timestamp: '',
    sectionViewTime: 0,
    userAgent: '',
    pageUrl: ''
  };

  // Verification page
  showVerificationPage: boolean = false;
  userSelections: any = {
    choice: '',
    cancellationReasons: [],
    subscription: '',
    startTime: '',
    payment: '',
    name: ''
  };

  // Validation properties
  showValidationError: boolean = false;
  validationMessage: string = '';
  nameError: boolean = false;
  nameErrorMessage: string = '';

  // Thanks modal
  showThanksModal: boolean = false;
  
  // Success page modal for cancellations
  showCancellationSuccess: boolean = false;

  // Idle time popup
  showIdlePopup: boolean = false;

  // Sticky header
  showStickyHeader: boolean = false;

  // Session tracking
  private sessionDataSent: boolean = false;
  showThankYouScreen: boolean = false;


  onChoiceChange(choice: string) {
    this.selectedChoice = choice;
    
    // Track when user starts filling the form
    if (!this.formStarted) {
      this.formStarted = true;
      this.formStartTime = Date.now();
      console.log('📝 Form started - User selected:', choice, 'at:', new Date(this.formStartTime));
      console.log('🔍 Form state after choice change:', {
        selectedChoice: this.selectedChoice,
        formStarted: this.formStarted,
        formSubmitted: this.formSubmitted
      });
    } else {
      console.log('📝 Form already started - User changed choice to:', choice);
    }
  }

  onWhatsAppClick() {
    if (!this.selectedChoice) {
      this.showValidationErrorModal('يرجى اختيار أحد الخيارات أولاً');
      return;
    }

    // Check if user spent enough time on pricing section (5 seconds = 5000ms)
    const totalTimeInSeconds = this.totalPricingTime / 1000;
    console.log('Total time spent on pricing section:', totalTimeInSeconds, 'seconds');
    
    if (totalTimeInSeconds < 5) {
      // Show validation dialog asking if they checked prices
      this.showPricingTimeValidation = true;
      document.body.style.overflow = 'hidden';
      return;
    }
    
    // Validate based on choice
    if (this.selectedChoice === 'cancel') {
      console.log('🎯 Direct cancellation flow - selectedChoice is cancel');
      // For cancellation, require at least one cancellation reason
      if (this.selectedCancellationReasons.length === 0) {
        this.showValidationErrorModal('يرجى اختيار سبب واحد على الأقل للإلغاء');
        return;
      }
      
      // If "other reason" is selected, require text input
      if (this.selectedCancellationReasons.includes('other') && (!this.otherCancellationReason || this.otherCancellationReason.trim() === '')) {
        this.showValidationErrorModal('يرجى كتابة السبب الآخر');
        return;
      }
      
      // Require subscription preference
      if (!this.selectedSubscription) {
        this.showValidationErrorModal('يرجى اختيار تفضيل الاشتراك في الرسائل');
        return;
      }
      
      console.log('🎯 Direct cancellation flow - calling showThanksMessage(true)');
      this.showThanksMessage(true); // Pass true to indicate this is a cancellation
      return;
    }
    
    if (this.selectedChoice === 'confirm') {
      // For confirmation, require start time
      if (!this.selectedStartTime) {
        this.showValidationErrorModal('يرجى اختيار متى تريد البدء');
        return;
      }
      
      // Require payment preference
      if (!this.selectedPayment) {
        this.showValidationErrorModal('يرجى اختيار حالة الدفع');
        return;
      }
      
      // For confirmations, collect all user selections
      this.userSelections = {
        choice: this.selectedChoice,
        cancellationReasons: this.selectedCancellationReasons,
        subscription: this.selectedSubscription,
        startTime: this.selectedStartTime,
        payment: this.selectedPayment,
        name: this.urlParams.name || '' // Use name from URL parameters
      };
      
      // Always show verification page for confirmations (regardless of payment method)
      this.showVerificationPage = true;
      // Prevent body scroll when verification page is open
      document.body.style.overflow = 'hidden';
    }
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    console.log('Next slide:', this.currentSlide, 'Total slides:', this.slides.length);
  }

  previousSlide() {
    this.currentSlide = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
    console.log('Previous slide:', this.currentSlide, 'Total slides:', this.slides.length);
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    console.log('Go to slide:', this.currentSlide, 'Total slides:', this.slides.length);
  }

  ngOnInit() {
    this.extractUrlParameters();
    this.initializeTracking();
    this.setupIntersectionObservers();
    this.setupScrollDetection();
    this.setupPageVisibilityTracking();
    
    // Start the simple 90-second timer
    this.startSimpleIdleTracking();
    
    // Mobile recovery: Check for pending tracking data
    this.checkMobileRecovery();
    
  }

  ngOnDestroy() {
    // Clear all timers
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.idlePopupTimer) {
      clearTimeout(this.idlePopupTimer);
    }
    if (this.pricingTimer) {
      clearTimeout(this.pricingTimer);
    }
    
    // Send data for session (only once per session)
    this.sendDataForSession('user_closed_page');
  }

  // ===== TRACKING SYSTEM METHODS =====

  private extractUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    this.urlParams = {
      email: urlParams.get('email') || undefined,
      name: urlParams.get('name') || undefined,
      campaignName: urlParams.get('Campaign_name') || undefined,
      adsetName: urlParams.get('Adset_name') || undefined,
      adName: urlParams.get('Ad_name') || undefined,
      fbClickId: urlParams.get('fbclid') || undefined
    };
    
    console.log('🔗 URL Parameters extracted:', {
      urlParams: this.urlParams,
      fullUrl: window.location.href,
      searchParams: window.location.search
    });
  }

  private initializeTracking() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.idleTime.lastActivity = Date.now();
    
    // Initialize section timers
    Object.keys(this.sectionEvents).forEach(sectionId => {
      this.sectionTimers[sectionId] = {
        totalTime: 0,
        isActive: false
      };
    });
    
    console.log('🎯 Tracking initialized:', {
      sessionId: this.sessionId,
      startTime: new Date(this.sessionStartTime)
    });
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private setupIntersectionObservers() {
    // Create intersection observer for section tracking
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const sectionId = '#' + entry.target.id;
        
        if (entry.isIntersecting) {
          this.startSectionTimer(sectionId);
        } else {
          this.stopSectionTimer(sectionId);
        }
      });
    }, { threshold: 0.5 });

    // Observe all sections after view init
    setTimeout(() => {
      Object.keys(this.sectionEvents).forEach(sectionId => {
        const element = document.querySelector(sectionId);
        if (element) {
          sectionObserver.observe(element);
          console.log('👀 Observing section:', sectionId);
        } else {
          console.warn('⚠️ Section not found:', sectionId);
        }
      });
    }, 100);

    // Keep existing pricing section observer
    this.setupExistingPricingObserver();
  }

  private setupExistingPricingObserver() {
    // Keep the existing pricing section observer for the popup
    const pricingObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.pricingSectionVisible = entry.isIntersecting;
        if (entry.isIntersecting && !this.hasShownPricingPopup) {
          this.startPricingTimer();
        } else if (!entry.isIntersecting) {
          this.stopPricingTimer();
        }
      });
    }, { threshold: 0.5 });

    setTimeout(() => {
      const pricingSection = document.querySelector('#pricing-section');
      if (pricingSection) {
        pricingObserver.observe(pricingSection);
      }
    }, 100);
  }

  private startSectionTimer(sectionId: string) {
    if (this.sectionTimers[sectionId] && !this.sectionTimers[sectionId].isActive) {
      this.sectionTimers[sectionId].isActive = true;
      this.sectionTimers[sectionId].currentSessionStart = Date.now();
      console.log('⏱️ Started timer for:', sectionId);
    }
  }

  private stopSectionTimer(sectionId: string) {
    if (this.sectionTimers[sectionId] && this.sectionTimers[sectionId].isActive) {
      const sessionTime = Date.now() - (this.sectionTimers[sectionId].currentSessionStart || 0);
      this.sectionTimers[sectionId].totalTime += sessionTime;
      this.sectionTimers[sectionId].isActive = false;
      this.sectionTimers[sectionId].currentSessionStart = undefined;
      
      const eventName = this.sectionEvents[sectionId];
      console.log('⏹️ Stopped timer for:', sectionId, 'Session time:', sessionTime, 'ms', 'Total:', this.sectionTimers[sectionId].totalTime, 'ms');
    }
  }


  private setupReadingActivityTracking() {
    // Track when user is actively viewing sections
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // User is actively viewing a section - consider this as activity
          this.startSimpleIdleTracking();
          console.log('👀 User actively viewing section:', entry.target.id);
        }
      });
    }, { threshold: 0.5 });

    // Observe all sections for reading activity
    setTimeout(() => {
      Object.keys(this.sectionEvents).forEach(sectionId => {
        const element = document.querySelector(sectionId);
        if (element) {
          sectionObserver.observe(element);
        }
      });
    }, 100);
  }

  private startSimpleIdleTracking() {
    // Store page load time for background tracking
    const pageLoadTime = Date.now();
    localStorage.setItem('nevys_page_load_time', pageLoadTime.toString());
    localStorage.setItem('nevys_session_id', this.sessionId);
    
    console.log('💾 Simple idle tracking started - page load time stored');
    
        // Start 90-second timer to show popup
        this.idleTimer = setTimeout(() => {
          this.showIdlePopup = true;
          this.idleTime.popupShownAt = Date.now();
          document.body.style.overflow = 'hidden';
          console.log('💬 Idle popup shown after 90 seconds');
        }, 90000); // 90 seconds
    
    // Track when user leaves the page
    let userLeftTime: number | null = null;
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // User left the page - record the time
        userLeftTime = Date.now();
        console.log('👋 User left tab at:', new Date(userLeftTime).toISOString());
        
        // Start checking if they stay away for 90 seconds
        const checkAwayTimer = setInterval(() => {
          if (!document.hidden) {
            // User came back - cancel the timer
            console.log('👋 User returned to tab - canceling away timer');
            clearInterval(checkAwayTimer);
            userLeftTime = null;
      return;
    }
    
          // Check if 90 seconds have passed since they left
          if (userLeftTime && (Date.now() - userLeftTime) >= 90000) {
            console.log('⏰ User has been away for 90 seconds - sending analytics');
            const timeAwaySeconds = Math.floor((Date.now() - userLeftTime) / 1000);
            this.sendAwayAnalytics(timeAwaySeconds);
            clearInterval(checkAwayTimer);
            userLeftTime = null;
          }
        }, 1000); // Check every second
        
      } else {
        // User returned to the page
        if (userLeftTime) {
          console.log('👋 User returned to tab - canceling away timer');
          userLeftTime = null;
        }
      }
    });
    
    // Also check on page unload (user closed tab/window) - Desktop only
    const isMobileForBeforeunload = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobileForBeforeunload) {
      window.addEventListener('beforeunload', () => {
        console.log('🚪 Desktop: Page unloading - sending data immediately');
        
        // Send session data if not already sent
        if (!this.sessionDataSent) {
          console.log('🚪 Desktop: beforeunload - Sending session data as user leaves');
          this.sendDataForSession('user_closed_page');
        }
        
        // Calculate time away from page load time
        const pageLoadTime = localStorage.getItem('nevys_page_load_time');
        if (pageLoadTime) {
          const timeAwaySeconds = Math.floor((Date.now() - parseInt(pageLoadTime)) / 1000);
          // Use same method as desktop for consistency
          this.sendAwayAnalytics(timeAwaySeconds);
        } else {
          // Fallback to 90 seconds if no page load time
          this.sendAwayAnalytics(90);
        }
      });
    }
  }
  







  private sendBackupRequest(fullUrl: string) {
    fetch(fullUrl, {
      method: 'GET',
      keepalive: true
    })
    .then(response => {
      if (response.ok) {
        console.log('✅ Analytics sent via fetch backup');
      } else {
        console.error('❌ Fetch backup failed:', response.status);
      }
    })
    .catch(error => {
      console.error('❌ Fetch backup error:', error);
    });
  }



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

  private isTimeField(key: string): boolean {
    return key.includes('duration') || key.includes('time') || key.includes('Time');
  }


  private setupScrollDetection() {
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Get the form section element
      const formSection = document.getElementById('form-section');
      if (formSection) {
        const formSectionTop = formSection.offsetTop;
        const formSectionHeight = formSection.offsetHeight;
        const windowHeight = window.innerHeight;
        
        // Calculate how much of the form section is visible
        const formSectionBottom = formSectionTop + formSectionHeight;
        const visibleTop = Math.max(formSectionTop, scrollTop);
        const visibleBottom = Math.min(formSectionBottom, scrollTop + windowHeight);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visiblePercentage = (visibleHeight / formSectionHeight) * 100;
        
        // Show sticky header when scrolling down more than 100px
        // Hide it when 50% or more of the form section is visible
        const shouldShow = scrollTop > 100 && visiblePercentage < 50;
        
        this.showStickyHeader = shouldShow;
      } else {
        // Fallback: show header when scrolling down more than 100px
        this.showStickyHeader = scrollTop > 100;
      }
    });
  }

  private setupPageVisibilityTracking() {
    let hiddenStartTime: number | null = null;
    let awayTimer: any = null;
    let mobileInterval: any = null;
    
    // Mobile-friendly approach: Use multiple fallback methods
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('📱 Mobile device detected:', isMobile);
    
    // Track when page becomes hidden/visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden (user switched to another tab, minimized browser, etc.)
        hiddenStartTime = Date.now();
        console.log('👁️ Page is now HIDDEN - User moved to another tab or minimized browser');
        console.log('📊 Visibility State:', document.visibilityState);
        console.log('🕐 Hidden at:', new Date().toISOString());
        console.log('⏱️ Hidden start time recorded:', hiddenStartTime);
        console.log('📱 Mobile device:', isMobile);
        
        if (isMobile) {
          // Mobile: Send analytics immediately when switching to another app
          console.log('📱 Mobile: User switched to another app - sending analytics immediately');
          
          // Store the time when user left
          localStorage.setItem('awayStartTime', hiddenStartTime.toString());
          localStorage.setItem('awayTrackingActive', 'true');
          
          // Mobile: Send analytics immediately when user switches to another app
          const actualTimeAway = Math.floor((Date.now() - this.sessionStartTime) / 1000);
          this.sendMobileAwayData(actualTimeAway);
          
        } else {
          // Desktop: Use setTimeout (more reliable on desktop)
          console.log('💻 Using desktop setTimeout tracking');
          awayTimer = setTimeout(() => {
            if (document.hidden && hiddenStartTime) {
              const timeAway = Date.now() - hiddenStartTime;
              const timeAwaySeconds = Math.floor(timeAway / 1000);
              
              console.log('🚨 Desktop: User has been away for 90+ seconds - Sending analytics NOW!');
              console.log('⏱️ Time away:', timeAwaySeconds, 'seconds');
              this.sendAwayAnalytics(timeAwaySeconds);
            }
          }, 90000); // 90 seconds
        }
        
        this.logPageVisibilityChange('hidden');
      } else {
        // Page is visible (user returned to this tab)
        if (hiddenStartTime) {
          const timeAway = Date.now() - hiddenStartTime;
          const timeAwaySeconds = Math.floor(timeAway / 1000);
          
          console.log('👁️ Page is now VISIBLE - User returned to this tab');
          console.log('📊 Visibility State:', document.visibilityState);
          console.log('🕐 Visible at:', new Date().toISOString());
          console.log('⏱️ Time spent away:', timeAwaySeconds, 'seconds');
          console.log('⏱️ Time away formatted:', this.formatTime(timeAwaySeconds));
          
          // Cancel timers and clear localStorage
          if (awayTimer) {
            clearTimeout(awayTimer);
            awayTimer = null;
            console.log('✅ User returned before 90 seconds - Analytics timer cancelled');
          }
          
          if (mobileInterval) {
            clearInterval(mobileInterval);
            mobileInterval = null;
            console.log('✅ Mobile: User returned before 90 seconds - Analytics interval cancelled');
          }
          
          // Clear mobile tracking data
          localStorage.removeItem('awayStartTime');
          localStorage.removeItem('awayTrackingActive');
          
          hiddenStartTime = null;
        } else {
          console.log('👁️ Page is now VISIBLE - User returned to this tab');
          console.log('📊 Visibility State:', document.visibilityState);
          console.log('🕐 Visible at:', new Date().toISOString());
        }
        
        this.logPageVisibilityChange('visible');
      }
    });

    // Also track when window loses/gains focus
    window.addEventListener('blur', () => {
      console.log('🔍 Window lost focus - User switched to another application');
      this.logPageVisibilityChange('blur');
    });

    window.addEventListener('focus', () => {
      console.log('🔍 Window gained focus - User returned to this application');
      this.logPageVisibilityChange('focus');
    });
    
    // Mobile-specific events that work better on mobile browsers
    if (isMobile) {
      console.log('📱 Adding mobile-specific event listeners');
      
      // Mobile: pagehide/pageshow events (more reliable than visibilitychange on mobile)
      window.addEventListener('pagehide', (event) => {
        console.log('📱 Mobile: pagehide event - User leaving page');
        if (!hiddenStartTime) {
          hiddenStartTime = Date.now();
          localStorage.setItem('awayStartTime', hiddenStartTime.toString());
          localStorage.setItem('awayTrackingActive', 'true');
          console.log('📱 Mobile: User leaving page - sending analytics immediately');
          
          // Mobile: Send analytics immediately when user leaves (no 90-second wait)
          const actualTimeAway = Math.floor((Date.now() - this.sessionStartTime) / 1000);
          this.sendMobileAwayData(actualTimeAway);
        }
      });
      
      window.addEventListener('pageshow', (event) => {
        console.log('📱 Mobile: pageshow event - User returned to page');
        if (hiddenStartTime) {
          const timeAway = Date.now() - hiddenStartTime;
          const timeAwaySeconds = Math.floor(timeAway / 1000);
          
          console.log('📱 Mobile: pageshow - Time away:', timeAwaySeconds, 'seconds');
          
          if (timeAwaySeconds >= 90) {
            console.log('🚨 Mobile: pageshow - User was away for 90+ seconds - Sending analytics!');
            this.sendAwayAnalytics(timeAwaySeconds);
          }
          
          // Clear tracking data
          localStorage.removeItem('awayStartTime');
          localStorage.removeItem('awayTrackingActive');
          hiddenStartTime = null;
        }
      });
      
      // Mobile: App state change events (iOS/Android specific)
      document.addEventListener('pause', () => {
        console.log('📱 Mobile: App paused - User switched to another app');
        if (!hiddenStartTime) {
          hiddenStartTime = Date.now();
          localStorage.setItem('awayStartTime', hiddenStartTime.toString());
          localStorage.setItem('awayTrackingActive', 'true');
          console.log('📱 Mobile: Started tracking on app pause');
        }
      });
      
      document.addEventListener('resume', () => {
        console.log('📱 Mobile: App resumed - User returned to this app');
        if (hiddenStartTime) {
          const timeAway = Date.now() - hiddenStartTime;
          const timeAwaySeconds = Math.floor(timeAway / 1000);
          
          console.log('📱 Mobile: resume - Time away:', timeAwaySeconds, 'seconds');
          
          if (timeAwaySeconds >= 90) {
            console.log('🚨 Mobile: resume - User was away for 90+ seconds - Sending analytics!');
            this.sendAwayAnalytics(timeAwaySeconds);
          }
          
          // Clear tracking data
          localStorage.removeItem('awayStartTime');
          localStorage.removeItem('awayTrackingActive');
          hiddenStartTime = null;
        }
      });
      
      // Mobile: Orientation change (indicates user interaction)
      window.addEventListener('orientationchange', () => {
        console.log('📱 Mobile: Orientation changed - User is interacting');
        // Reset any tracking if user is actively using the device
        if (hiddenStartTime) {
          console.log('📱 Mobile: User interaction detected - Cancelling away tracking');
          hiddenStartTime = null;
          localStorage.removeItem('awayStartTime');
          localStorage.removeItem('awayTrackingActive');
        }
      });
    }
    
    // Mobile-specific: Add additional mobile event listeners
    if (isMobile) {
      // Mobile: Touch events to detect user interaction
      document.addEventListener('touchstart', () => {
        console.log('📱 Mobile: Touch detected - User is interacting');
        if (hiddenStartTime) {
          console.log('📱 Mobile: User interaction detected - Cancelling away tracking');
          hiddenStartTime = null;
          localStorage.removeItem('awayStartTime');
          localStorage.removeItem('awayTrackingActive');
        }
      });
      
      // Mobile: Device motion (if user is moving the device)
      window.addEventListener('devicemotion', () => {
        console.log('📱 Mobile: Device motion detected - User is interacting');
        if (hiddenStartTime) {
          console.log('📱 Mobile: User interaction detected - Cancelling away tracking');
          hiddenStartTime = null;
          localStorage.removeItem('awayStartTime');
          localStorage.removeItem('awayTrackingActive');
        }
      });
    }
    
    // Mobile-specific: Add beforeunload for last-chance analytics
    window.addEventListener('beforeunload', () => {
      if (isMobile) {
        // Mobile: Send analytics immediately when closing page
        console.log('📱 Mobile: beforeunload - Sending analytics as user closes page');
        const actualTimeAway = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        this.sendMobileAwayData(actualTimeAway);
      } else if (!isMobile) {
        // Desktop: Keep existing logic (90-second threshold)
        if (!this.sessionDataSent) {
          console.log('🖥️ Desktop: beforeunload - Sending session data as user leaves');
          this.sendDataForSession('user_closed_page');
        }
        
        // Calculate time away from page load time for desktop
        const pageLoadTime = localStorage.getItem('nevys_page_load_time');
        if (pageLoadTime) {
          const timeAwaySeconds = Math.floor((Date.now() - parseInt(pageLoadTime)) / 1000);
          // Use same method as desktop for consistency
          this.sendAwayAnalytics(timeAwaySeconds);
        } else {
          // Fallback to 90 seconds if no page load time
          this.sendAwayAnalytics(90);
        }
      }
    });
  }

  private checkMobileRecovery() {
    // Check if this is a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      console.log('📱 Mobile recovery check on page load - CLEARING STALE DATA ONLY');
      
      // Clear any stale tracking data from previous sessions
      // DO NOT send any analytics on page load - only clear stale data
      localStorage.removeItem('userLeftTime');
      localStorage.removeItem('waitingFor90Seconds');
      localStorage.removeItem('awayStartTime');
      localStorage.removeItem('awayTrackingActive');
      localStorage.removeItem('mobileAwayStartTime');
      localStorage.removeItem('mobileWaitingFor90Seconds');
      
      console.log('📱 Mobile: Cleared all stale tracking data - no analytics sent on page load');
    }
  }

  private logPageVisibilityChange(state: string) {
    const timestamp = new Date().toISOString();
    const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    
    console.log('📋 Page Visibility Change Log:', {
      state: state,
      timestamp: timestamp,
      sessionTime: sessionTime,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      pageUrl: window.location.href
    });
    
    // You can add more detailed logging here if needed
    // This is just for logging - no data is sent to Zapier
  }

  private async sendAwayAnalytics(timeAwaySeconds: number) {
    console.log('🚀 sendAwayAnalytics called - User was away for', timeAwaySeconds, 'seconds (90+ second threshold)');
    
    // Check if data has already been sent for this session
    if (this.sessionDataSent) {
      console.log(`⚠️ Data already sent for this session - skipping away analytics`);
      return;
    }
    
    // Calculate form interaction time
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds) - same as your existing pattern
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime,
      time_away_seconds: timeAwaySeconds // Add the time away data
    };

    // Check if in development mode
    if (this.isDevelopment) {
      console.log('🔧 Development mode: Logging away analytics (no Zapier API call)');
      console.log('📊 Away analytics data that would be sent:');
      console.log({
        trigger: 'user_away_for_60_plus_seconds',
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        name: this.urlParams.name || '',
        email: this.urlParams.email || '',
        campaignName: this.urlParams.campaignName || '',
        adsetName: this.urlParams.adsetName || '',
        adName: this.urlParams.adName || '',
        fbClickId: this.urlParams.fbClickId || '',
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        totalSessionTime: Math.floor((Date.now() - this.sessionStartTime) / 1000),
        timeAwaySeconds: timeAwaySeconds,
        events: events
      });
      return;
    }

    // Capture any form selections the user made before leaving
    const userSelections = this.captureUserSelections();
    
    // Prepare data for ZapierService with user selections
    const formData: FormData = {
      selectedResponse: userSelections.selectedResponse,
      cancelReasons: userSelections.cancelReasons,
      otherReason: userSelections.otherReason,
      marketingConsent: userSelections.marketingConsent,
      englishImpact: 'Not Applicable',
      preferredStartTime: userSelections.preferredStartTime,
      paymentReadiness: userSelections.paymentReadiness,
      pricingResponse: userSelections.pricingResponse,
      name: this.urlParams.name || '',
      email: this.urlParams.email || '',
      campaignName: this.urlParams.campaignName || '',
      adsetName: this.urlParams.adsetName || '',
      adName: this.urlParams.adName || '',
      fbClickId: this.urlParams.fbClickId || '',
      sessionId: this.sessionId,
      trigger: 'user_away_for_60_plus_seconds',
      timestamp: new Date().toISOString(),
      totalSessionTime: Math.floor((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      userAgent: navigator.userAgent,
      pageUrl: window.location.href,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted,
      formInteractionTime: formInteractionTime,
      description: this.formatAwayAnalyticsDescription(events, timeAwaySeconds, userSelections)
    };

    console.log('📡 Sending away analytics via ZapierService:', formData);

    try {
      // Send using ZapierService
      await this.zapierService.sendToZapier(formData);
      console.log('✅ Away analytics successfully sent via ZapierService');

    } catch (error) {
      console.error('❌ Error sending away analytics via ZapierService:', error);
    }
  }

  // Capture any form selections the user made before leaving
  private captureUserSelections() {
    console.log('📝 Capturing user selections before leaving:', {
      selectedChoice: this.selectedChoice,
      selectedCancellationReasons: this.selectedCancellationReasons,
      selectedSubscription: this.selectedSubscription,
      selectedStartTime: this.selectedStartTime,
      selectedPayment: this.selectedPayment,
      otherCancellationReason: this.otherCancellationReason
    });

    // Determine the response type based on what was selected
    let selectedResponse = 'User Away'; // Default for no interaction
    if (this.selectedChoice === 'cancel') {
      selectedResponse = 'Cancel';
    } else if (this.selectedChoice === 'confirm') {
      selectedResponse = 'Confirm Interest';
    }

    return {
      selectedResponse: selectedResponse,
      cancelReasons: this.getCancellationReasonsEnglish(this.selectedCancellationReasons),
      otherReason: this.otherCancellationReason || '',
      marketingConsent: this.selectedSubscription || '',
      preferredStartTime: this.getStartTimeEnglish(this.selectedStartTime),
      paymentReadiness: this.getPaymentEnglish(this.selectedPayment),
      pricingResponse: this.selectedPlan || ''
    };
  }

  // Mobile-friendly method using sendBeacon (works even when page is backgrounded)
  private async sendMobileAwayData(timeAwaySeconds: number) {
    console.log('📱 Mobile: sendMobileAwayData called - User was away for', timeAwaySeconds, 'seconds');
    
    // Check if data has already been sent for this session
    if (this.sessionDataSent) {
      console.log('⚠️ Mobile: Data already sent for this session - skipping');
      return;
    }

    // Calculate form interaction time
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds)
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime,
      time_away_seconds: timeAwaySeconds
    };

    // Capture any form selections the user made before leaving
    const userSelections = this.captureUserSelections();
    
    // Prepare data with captured user selections
    const formData = {
      selectedResponse: userSelections.selectedResponse,
      cancelReasons: userSelections.cancelReasons,
      otherReason: userSelections.otherReason,
      marketingConsent: userSelections.marketingConsent,
      englishImpact: 'Not Applicable',
      preferredStartTime: userSelections.preferredStartTime,
      paymentReadiness: userSelections.paymentReadiness,
      pricingResponse: userSelections.pricingResponse,
      name: this.urlParams.name || '',
      email: this.urlParams.email || '',
      campaignName: this.urlParams.campaignName || '',
      adsetName: this.urlParams.adsetName || '',
      adName: this.urlParams.adName || '',
      fbClickId: this.urlParams.fbClickId || '',
      sessionId: this.sessionId,
      trigger: 'user_away_for_90_plus_seconds',
      timestamp: new Date().toISOString(),
      totalSessionTime: Math.floor((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      userAgent: navigator.userAgent,
      pageUrl: window.location.href,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted,
      formInteractionTime: formInteractionTime,
      description: this.formatAwayAnalyticsDescription(events, timeAwaySeconds, this.captureUserSelections())
    };

    console.log('📱 Mobile: Sending away analytics via sendBeacon:', formData);

    try {
      // Convert formData to URL parameters for sendBeacon
      const params = new URLSearchParams();
      params.set('first_name', formData.name || 'Prospect');
      params.set('last_name', 'Nevys');
      params.set('company', 'Nevy\'s Language Prospect');
      params.set('lead_source', 'Website Confirmation Page');
      params.set('status', 'New');
      
      // Calculate appointment status based on actual form state
      const appointmentStatus = this.getAppointmentStatusForAway(formData.selectedResponse, formData.formSubmitted, formData.formStarted);
      params.set('appointment_status', appointmentStatus);
      
      params.set('response_type', formData.selectedResponse);
      params.set('cancel_reasons', formData.cancelReasons?.join(', ') || '');
      params.set('other_reason', formData.otherReason || '');
      params.set('marketing_consent', formData.marketingConsent);
      params.set('english_impact', formData.englishImpact);
      params.set('preferred_start_time', formData.preferredStartTime);
      params.set('payment_readiness', formData.paymentReadiness);
      params.set('pricing_response', formData.pricingResponse);
      params.set('email', formData.email || '');
      params.set('session_id', formData.sessionId || '');
      params.set('trigger', formData.trigger || '');
      params.set('total_session_time', formData.totalSessionTime?.toString() || '0');
      params.set('form_started', formData.formStarted?.toString() || 'false');
      params.set('form_submitted', formData.formSubmitted?.toString() || 'false');
      params.set('form_interaction_time', formData.formInteractionTime?.toString() || '0');
      params.set('events', JSON.stringify(formData.events));
      params.set('submission_date', new Date().toISOString());
      params.set('source_url', window.location.href);
      params.set('user_agent', navigator.userAgent);
      params.set('page_url', window.location.href);
      params.set('description', formData.description || '');
      params.set('notes', formData.description || '');
      params.set('comments', formData.description || '');
      
      // Add record parameter for Make.com compatibility
      const recordData = {
        first_name: formData.name || 'Prospect',
        last_name: 'Nevys',
        company: 'Nevy\'s Language Prospect',
        lead_source: 'Website Confirmation Page',
        status: 'New',
        email: formData.email || '',
        appointment_status: appointmentStatus,
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
        description: formData.description || ''
      };
      
      // Add record parameter as JSON string
      params.set('record', JSON.stringify(recordData));

      // const webhookUrl = 'https://hook.us1.make.com/uc37wscl0r75np86zrss260m9mecyubf';
      const webhookUrl = 'https://hook.us1.make.com/mg2gg69ynee6or7x8pv5pzt1x3ewjl1t';
      const fullUrl = `${webhookUrl}?${params.toString()}`;
      
      // Debug: Log the full URL and record parameter
      console.log('📱 Mobile: Full webhook URL:', fullUrl);
      console.log('📱 Mobile: Record parameter:', JSON.stringify(recordData));
      console.log('📱 Mobile: Record parameter length:', JSON.stringify(recordData).length);
      
      // Use sendBeacon for reliable delivery on mobile (works even when page is backgrounded)
      const sent = navigator.sendBeacon(fullUrl);
      
      if (sent) {
        console.log('✅ Mobile: Away analytics successfully sent via sendBeacon');
        this.sessionDataSent = true; // Mark as sent to prevent duplicates
      } else {
        console.error('❌ Mobile: sendBeacon failed to queue the request');
        
        // Fallback: Try using fetch with keepalive
        console.log('🔄 Mobile: Trying fetch fallback...');
        try {
          const response = await fetch(fullUrl, {
            method: 'GET',
            keepalive: true
          });
          
          if (response.ok) {
            console.log('✅ Mobile: Fallback fetch successful');
            this.sessionDataSent = true;
          } else {
            console.error('❌ Mobile: Fallback fetch failed:', response.status);
          }
        } catch (fallbackError) {
          console.error('❌ Mobile: Fallback fetch error:', fallbackError);
        }
      }

    } catch (error) {
      console.error('❌ Mobile: Error sending away analytics via sendBeacon:', error);
    }
  }

  private formatAwayAnalyticsDescription(events: any, timeAwaySeconds: number, userSelections?: any): string {
    let description = `Away Analytics - User Was Away for 90+ Seconds\n\n`;
    
    // Basic information
    description += `Trigger: User Away for 90+ Seconds\n`;
    description += `Session ID: ${this.sessionId}\n`;
    description += `User: ${this.urlParams.name || 'Unknown'}\n`;
    description += `Email: ${this.urlParams.email || 'Unknown'}\n`;
    description += `Total Session Time: ${this.formatTime(Math.floor((Date.now() - this.sessionStartTime) / 1000))}\n`;
    description += `Time Away: ${this.formatTime(timeAwaySeconds)}\n\n`;
    
    // Form state when user left
    description += `Form State When User Left:\n`;
    description += `Selected Choice: ${userSelections?.selectedResponse || this.getChoiceEnglish(this.selectedChoice) || 'None'}\n`;
    description += `Form Started: ${this.formStarted}\n`;
    description += `Form Submitted: ${this.formSubmitted}\n`;
    
    // Use captured user selections if available
    if (userSelections) {
      if (userSelections.cancelReasons && userSelections.cancelReasons.length > 0) {
        description += `Cancellation Reasons: ${userSelections.cancelReasons.join(', ')}\n`;
      }
      
      if (userSelections.otherReason) {
        description += `Other Reason: ${userSelections.otherReason}\n`;
      }
      
      if (userSelections.marketingConsent) {
        description += `Marketing Consent: ${userSelections.marketingConsent}\n`;
      }
      
      if (userSelections.preferredStartTime) {
        description += `Preferred Start Time: ${userSelections.preferredStartTime}\n`;
      }
      
      if (userSelections.paymentReadiness) {
        description += `Payment Readiness: ${userSelections.paymentReadiness}\n`;
      }
    } else {
      // Fallback to current form state
      if (this.selectedCancellationReasons.length > 0) {
        description += `Cancellation Reasons: ${this.getCancellationReasonsEnglish(this.selectedCancellationReasons).join(', ')}\n`;
      }
      
      if (this.otherCancellationReason) {
        description += `Other Reason: ${this.otherCancellationReason}\n`;
      }
      
      if (this.selectedSubscription) {
        description += `Marketing Consent: ${this.selectedSubscription}\n`;
      }
      
      if (this.selectedStartTime) {
        description += `Preferred Start Time: ${this.getStartTimeEnglish(this.selectedStartTime)}\n`;
      }
      
      if (this.selectedPayment) {
        description += `Payment Readiness: ${this.getPaymentEnglish(this.selectedPayment)}\n`;
      }
    }
    
    description += `\n`;
    
    // Campaign tracking
    if (this.urlParams.campaignName || this.urlParams.adsetName || this.urlParams.adName) {
      description += `Campaign Tracking:\n`;
      if (this.urlParams.campaignName) {
        description += `Campaign: ${this.urlParams.campaignName}\n`;
      }
      if (this.urlParams.adsetName) {
        description += `Adset: ${this.urlParams.adsetName}\n`;
      }
      if (this.urlParams.adName) {
        description += `Ad: ${this.urlParams.adName}\n`;
      }
      description += `\n`;
    }
    
    // Analytics data
    description += `Analytics Events:\n`;
    Object.keys(events).forEach(key => {
      const readableKey = this.getReadableEventName(key);
      const value = events[key];
      const formattedValue = this.isTimeField(key) ? this.formatTime(value) : value;
      description += `• ${readableKey}: ${formattedValue}\n`;
    });
    
    description += `\nUser returned to page after being away for: ${this.formatTime(timeAwaySeconds)}`;
    description += `\nAnalytics sent on: ${new Date().toLocaleString()}`;
    
    return description;
  }


  private sendTrackingData(trigger: string) {
    // Stop all active timers
    Object.keys(this.sectionTimers).forEach(sectionId => {
      if (this.sectionTimers[sectionId].isActive) {
        this.stopSectionTimer(sectionId);
      }
    });

    // Add any remaining idle time
    if (this.idleTime.isIdle) {
      const remainingIdle = Date.now() - this.idleTime.lastActivity;
      this.idleTime.total += remainingIdle;
    }

    // Calculate form interaction time for submitters
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds)
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    // Determine appointment status based on user's choice
    const userChoice = this.userSelections.choice || this.selectedChoice;
    let appointmentStatus = ''; // Default for no response
    
    // Only set appointment status if they actually completed the form
    if (this.formSubmitted) {
      if (userChoice === 'confirm') {
        appointmentStatus = 'Confirmed';
      } else if (userChoice === 'cancel') {
        appointmentStatus = 'Cancelled';
      }
    }
    // If they started but didn't submit, appointment status remains empty

    // Prepare Zapier webhook data for lead update
    const zapierData = {
      // Lead identification (from previous form)
      lead_email: this.urlParams.email,
      lead_name: this.urlParams.name,
      
      // Campaign tracking data
      campaign_name: this.urlParams.campaignName,
      adset_name: this.urlParams.adsetName,
      ad_name: this.urlParams.adName,
      fb_click_id: this.urlParams.fbClickId,
      
      // Confirmation page data - use current form state, not userSelections
      confirmation_choice: this.getChoiceEnglish(this.selectedChoice),
      cancellation_reasons: this.getCancellationReasonsEnglish(this.selectedCancellationReasons),
      other_reason: this.otherCancellationReason || '',
      subscription_preference: this.selectedSubscription,
      preferred_start_time: this.getStartTimeEnglish(this.selectedStartTime),
      payment_access: this.getPaymentEnglish(this.selectedPayment),
      
      // Appointment status - NEW!
      appointment_status: appointmentStatus,
      
      // Session tracking data
      session_id: this.sessionId,
      trigger: trigger,
      timestamp: new Date().toISOString(),
      total_session_time: Math.round((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      
      // Form interaction data
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: this.formStarted && this.formStartTime > 0 ? Math.round((Date.now() - this.formStartTime) / 1000) : 0
    };

    // Add formatted description after the object is created
    (zapierData as any).description = this.formatConfirmationDescription(zapierData, events, appointmentStatus);

    // Console logging for debugging with better formatting
    console.log('📊 TRACKING DATA SENT:');
    console.log('Trigger:', trigger);
    console.log('Session ID:', this.sessionId);
    console.log('Events:', JSON.stringify(events, null, 2));
    console.log('Zapier Data:', JSON.stringify(zapierData, null, 2));

    // Send to Zapier webhook using ZapierService for proper description formatting
    this.sendToZapierWithService(zapierData);
    
    // TODO: Send to Hotjar
    // this.sendToHotjar(events);
  }

  // New method using the successful Zapier service pattern
  private async sendFormDataToZapier() {
    // In development mode, just log the data without making API calls
    if (this.isDevelopment) {
      console.log('🔧 Development mode: Logging form data (no Zapier API call)');
      console.log('📊 Form data that would be sent:');
      console.log(JSON.stringify({
        selectedResponse: this.selectedChoice,
        cancelReasons: this.selectedCancellationReasons,
        marketingConsent: this.selectedSubscription,
        preferredStartTime: this.selectedStartTime,
        paymentReadiness: this.selectedPayment,
        otherReason: this.otherCancellationReason,
        name: this.urlParams.name,
        email: this.urlParams.email,
        campaignName: this.urlParams.campaignName,
        adsetName: this.urlParams.adsetName,
        adName: this.urlParams.adName,
        fbClickId: this.urlParams.fbClickId
      }, null, 2));
      return;
    }
    
      // Calculate form interaction time
      let formInteractionTime = 0;
      if (this.formStarted && this.formStartTime > 0) {
        formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
      }

      // Prepare events data (convert to seconds)
      const events = {
        session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
        session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
        session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
        session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
        session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
        session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
        session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
        session_idle_time_duration: Math.round(this.idleTime.total / 1000),
        form_started: this.formStarted,
        form_submitted: this.formSubmitted,
        form_interaction_time: formInteractionTime
      };

      // Prepare form data in the successful format with analytics
      const formData: FormData = {
        selectedResponse: this.getChoiceEnglish(this.selectedChoice),
        cancelReasons: this.getCancellationReasonsEnglish(this.selectedCancellationReasons),
        otherReason: this.otherCancellationReason || undefined, // Include custom reason text
        marketingConsent: this.selectedSubscription,
        englishImpact: 'Not Applicable', // This form doesn't have English impact question
        preferredStartTime: this.getStartTimeEnglish(this.selectedStartTime),
        paymentReadiness: this.getPaymentEnglish(this.selectedPayment),
        pricingResponse: this.selectedPlan || 'Not Selected',
        name: this.urlParams.name,
        email: this.urlParams.email,
        campaignName: this.urlParams.campaignName,
        adsetName: this.urlParams.adsetName,
        adName: this.urlParams.adName,
        fbClickId: this.urlParams.fbClickId,
        // Analytics data
        sessionId: this.sessionId,
        trigger: 'form_submission',
        timestamp: new Date().toISOString(),
        totalSessionTime: Math.round((Date.now() - this.sessionStartTime) / 1000),
        events: events,
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        formStarted: this.formStarted,
        formSubmitted: this.formSubmitted,
        formInteractionTime: formInteractionTime
      };

    try {
      console.log('📤 Sending form data with analytics to Zapier:', formData);
      
      // Send using the new service
      console.log('🚀 Attempting to send form data to Zapier...');
      const response = await this.zapierService.sendToZapier(formData);
      console.log('✅ Successfully sent to Zapier:', response);
      
    } catch (error: any) {
      console.error('❌ Zapier Service Error:', {
        error: error,
        message: error?.message || 'Unknown error',
        status: error?.status || 'Unknown status'
      });
      
      // Try fallback method
      console.log('🔄 Trying fallback method...');
      try {
        this.sendToZapier(formData);
      } catch (fallbackError: any) {
        console.error('❌ Fallback method also failed:', fallbackError);
      }
    }
  }

  // Send data using ZapierService (confirmation page data)
  private async sendToZapier(data: any) {
    try {
      // Data is already in the correct FormData format from sendDataForSession methods
      // No need to convert - just pass it directly to ZapierService
      console.log('📤 Sending data via ZapierService:', data);
      
      // Send using ZapierService
      await this.zapierService.sendToZapier(data);
      
      console.log('✅ Data successfully sent via ZapierService');
      
    } catch (error) {
      console.error('❌ Error sending data via ZapierService:', error);
    }
  }


  // Centralized method to send data for session (only once per session)
  private sendDataForSession(scenario: string) {
    // Check if data has already been sent for this session
    if (this.sessionDataSent) {
      console.log(`⚠️ Data already sent for this session - skipping duplicate`);
      return;
    }
    
    // Mark this session as data sent
    this.sessionDataSent = true;
    console.log(`📤 Sending data for session (scenario: ${scenario})`);
    console.log(`🔍 Form state at data send:`, {
      selectedChoice: this.selectedChoice,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted,
      selectedCancellationReasons: this.selectedCancellationReasons,
      selectedSubscription: this.selectedSubscription,
      selectedStartTime: this.selectedStartTime,
      selectedPayment: this.selectedPayment,
      otherCancellationReason: this.otherCancellationReason
    });
    
    // Handle case where user closes page without any interaction
    if (!this.selectedChoice && !this.formStarted) {
      console.log('📝 No user interaction detected - sending minimal data');
      this.sendMinimalData(scenario);
      return;
    }
    
    // Handle case where user started form but didn't complete it
    if (this.formStarted && !this.formSubmitted) {
      console.log('📝 Partial form completion detected - sending partial form data');
      this.sendPartialFormData(scenario);
      return;
    }
    
    // Calculate form interaction time
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds)
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    // Prepare data in the format expected by ZapierService
    const formData: FormData = {
      selectedResponse: this.getChoiceEnglish(this.selectedChoice),
      cancelReasons: this.getCancellationReasonsEnglish(this.selectedCancellationReasons),
      otherReason: this.otherCancellationReason || '',
      marketingConsent: this.selectedSubscription || '',
      englishImpact: 'Not Applicable',
      preferredStartTime: this.getStartTimeEnglish(this.selectedStartTime),
      paymentReadiness: this.getPaymentEnglish(this.selectedPayment),
      pricingResponse: '',
      name: this.urlParams.name || '',
      email: this.urlParams.email || '',
      campaignName: this.urlParams.campaignName || '',
      adsetName: this.urlParams.adsetName || '',
      adName: this.urlParams.adName || '',
      fbClickId: this.urlParams.fbClickId || '',
      sessionId: this.sessionId,
      trigger: scenario,
      timestamp: new Date().toISOString(),
      totalSessionTime: Math.round((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      userAgent: navigator.userAgent,
      pageUrl: window.location.href,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted,
      formInteractionTime: formInteractionTime
    };

    console.log(`📊 SCENARIO DATA (${scenario}):`, formData);
    console.log(`🔍 Current form state:`, {
      selectedChoice: this.selectedChoice,
      selectedCancellationReasons: this.selectedCancellationReasons,
      selectedSubscription: this.selectedSubscription,
      selectedStartTime: this.selectedStartTime,
      selectedPayment: this.selectedPayment,
      otherCancellationReason: this.otherCancellationReason
    });
    
    // Send to Make.com webhook using ZapierService
    this.sendToZapier(formData);
  }

  private sendMinimalData(scenario: string) {
    console.log('📤 Sending minimal data for no-interaction scenario');
    
    // Calculate form interaction time
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds)
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    // Prepare minimal data for no-interaction scenario
    const formData: FormData = {
      selectedResponse: '', // Empty for no interaction
      cancelReasons: [],
      otherReason: '',
      marketingConsent: '',
      englishImpact: 'Not Applicable',
      preferredStartTime: '',
      paymentReadiness: '',
      pricingResponse: '',
      name: this.urlParams.name || '',
      email: this.urlParams.email || '',
      campaignName: this.urlParams.campaignName || '',
      adsetName: this.urlParams.adsetName || '',
      adName: this.urlParams.adName || '',
      fbClickId: this.urlParams.fbClickId || '',
      sessionId: this.sessionId,
      trigger: scenario,
      timestamp: new Date().toISOString(),
      totalSessionTime: Math.round((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      userAgent: navigator.userAgent,
      pageUrl: window.location.href,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted,
      formInteractionTime: formInteractionTime
    };

    console.log(`📊 MINIMAL DATA (${scenario}):`, formData);
    console.log(`🔍 No interaction scenario - appointment_status will be empty`);
    
    // Send to Make.com webhook using ZapierService
    this.sendToZapier(formData);
  }

  // Method to handle partial form completion scenarios
  private sendPartialFormData(scenario: string) {
    console.log('📤 Sending partial form data for incomplete interaction');
    
    // Calculate form interaction time
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds)
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    // Determine the appropriate response based on what was selected
    let selectedResponse = 'No Response';
    if (this.selectedChoice === 'cancel') {
      selectedResponse = 'Cancel';
    } else if (this.selectedChoice === 'confirm') {
      selectedResponse = 'Confirm Interest';
    }

    // Prepare partial form data
    const formData: FormData = {
      selectedResponse: selectedResponse,
      cancelReasons: this.getCancellationReasonsEnglish(this.selectedCancellationReasons),
      otherReason: this.otherCancellationReason || '',
      marketingConsent: this.selectedSubscription || '',
      englishImpact: 'Not Applicable',
      preferredStartTime: this.getStartTimeEnglish(this.selectedStartTime),
      paymentReadiness: this.getPaymentEnglish(this.selectedPayment),
      pricingResponse: '',
      name: this.urlParams.name || '',
      email: this.urlParams.email || '',
      campaignName: this.urlParams.campaignName || '',
      adsetName: this.urlParams.adsetName || '',
      adName: this.urlParams.adName || '',
      fbClickId: this.urlParams.fbClickId || '',
      sessionId: this.sessionId,
      trigger: scenario,
      timestamp: new Date().toISOString(),
      totalSessionTime: Math.round((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      userAgent: navigator.userAgent,
      pageUrl: window.location.href,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted,
      formInteractionTime: formInteractionTime
    };

    console.log(`📊 PARTIAL FORM DATA (${scenario}):`, formData);
    
    // Send to Make.com webhook using ZapierService
    this.sendToZapier(formData);
  }

  private sendAnalyticsToMake() {
    // Calculate form interaction time
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds)
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    // Prepare analytics data for Make.com (Second call)
    const analyticsData = {
      // Lead identification
      lead_email: this.urlParams.email,
      lead_name: this.urlParams.name,
      
      // Campaign data
      campaign_name: this.urlParams.campaignName,
      adset_name: this.urlParams.adsetName,
      ad_name: this.urlParams.adName,
      fb_click_id: this.urlParams.fbClickId,
      
      // Analytics trigger
      trigger: 'whatsapp_button_clicked',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      total_session_time: Math.round((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      
      // Form interaction data
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime,
      
      // User choice data
      selected_choice: this.selectedChoice,
      cancellation_reasons: this.selectedCancellationReasons,
      subscription_preference: this.selectedSubscription,
      preferred_start_time: this.selectedStartTime,
      payment_method_available: this.selectedPayment
    };

    console.log('📊 ANALYTICS DATA (Second Make.com call):', analyticsData);
    
    // Send to Make.com webhook (Second call)
    this.sendToZapier(analyticsData);
  }

  private sendLeadUpdateToZapier() {
    // Calculate form interaction time
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds)
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    // Prepare lead update data with full analytics
    const leadUpdateData = {
      // Lead identification
      email: this.urlParams.email,
      name: this.urlParams.name,
      
      // Campaign data
      campaign_name: this.urlParams.campaignName,
      adset_name: this.urlParams.adsetName,
      ad_name: this.urlParams.adName,
      fb_click_id: this.urlParams.fbClickId,
      
      // Confirmation responses
      confirmation_status: this.selectedChoice === 'confirm' ? 'Confirmed Interest' : 'Cancelled',
      choice: this.selectedChoice,
      
      // Detailed responses
      cancellation_reasons: this.getCancellationReasonsEnglish(this.selectedCancellationReasons),
      subscription_opt_in: this.selectedSubscription,
      preferred_start_time: this.getStartTimeEnglish(this.selectedStartTime),
      payment_method_available: this.getPaymentEnglish(this.selectedPayment),
      
      // Analytics data
      session_id: this.sessionId,
      trigger: 'form_submission_start',
      timestamp: new Date().toISOString(),
      total_session_time: Math.round((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    console.log('📋 LEAD UPDATE DATA:', leadUpdateData);
    
    // Send to Zapier (you'll need to replace the URL)
    this.sendToZapier(leadUpdateData);
  }

  private formatConfirmationDescription(data: any, events: any, appointmentStatus: string): string {
    let description = `Confirmation Page Analytics - User Left Page\n\n`;
    
    // User response section
    description += `User Response: ${data.confirmation_choice || 'No response'}\n`;
    description += `Appointment Status: ${appointmentStatus || 'Not set (user didn\'t complete form)'}\n\n`;
    
    // Show partial form data if they started but didn't complete
    if (data.form_started && !data.form_submitted) {
      description += `📝 PARTIAL FORM DATA (User started but didn't complete):\n`;
      
      if (data.cancellation_reasons && data.cancellation_reasons !== 'None') {
        description += `• Cancellation Reasons Selected: ${data.cancellation_reasons}\n`;
      }
      
      if (data.subscription_preference) {
        description += `• Marketing Consent: ${data.subscription_preference}\n`;
      }
      
      if (data.preferred_start_time) {
        description += `• Preferred Start Time: ${data.preferred_start_time}\n`;
      }
      
      if (data.payment_access) {
        description += `• Payment Readiness: ${data.payment_access}\n`;
      }
      
      if (data.other_reason) {
        description += `• Other Reason Details: ${data.other_reason}\n`;
      }
      
      description += `\n⚠️ This user showed interest by starting the form but didn't complete it\n\n`;
    }
    
    // Cancellation details if applicable
    if (data.cancellation_reasons && data.cancellation_reasons !== 'None') {
      description += `Cancellation Reasons: ${data.cancellation_reasons}\n`;
    }
    
    if (data.subscription_preference) {
      description += `Marketing Consent: ${data.subscription_preference}\n`;
    }
    
    if (data.preferred_start_time) {
      description += `Preferred Start Time: ${data.preferred_start_time}\n`;
    }
    
    if (data.payment_access) {
      description += `Payment Readiness: ${data.payment_access}\n`;
    }
    
    // Session analytics
    description += `\nSession Analytics:\n`;
    description += `Session ID: ${data.session_id}\n`;
    description += `Total Session Time: ${this.formatTime(data.total_session_time)}\n`;
    description += `Form Started: ${data.form_started ? 'Yes' : 'No'}\n`;
    description += `Form Submitted: ${data.form_submitted ? 'Yes' : 'No'}\n`;
    
    if (data.form_interaction_time > 0) {
      description += `Form Interaction Time: ${this.formatTime(data.form_interaction_time)}\n`;
    }
    
    // Section time analytics
    description += `\nTime Spent on Sections:\n`;
    Object.keys(events).forEach(key => {
      if (key.includes('session_duration_on_') && events[key] > 0) {
        const sectionName = key.replace('session_duration_on_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        description += `• ${sectionName}: ${this.formatTime(events[key])}\n`;
      }
    });
    
    if (events.session_idle_time_duration > 0) {
      description += `• Idle Time: ${this.formatTime(events.session_idle_time_duration)}\n`;
    }
    
    // Campaign data
    if (data.campaign_name || data.adset_name || data.ad_name) {
      description += `\nCampaign Tracking:\n`;
      if (data.campaign_name) description += `Campaign: ${data.campaign_name}\n`;
      if (data.adset_name) description += `Adset: ${data.adset_name}\n`;
      if (data.ad_name) description += `Ad: ${data.ad_name}\n`;
    }
    
    description += `\nTrigger: ${data.trigger}\n`;
    description += `Submitted on: ${new Date().toLocaleString()}`;
    
    return description;
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private async sendToZapierWithService(zapierData: any) {
    try {
      // Convert the zapierData to the format expected by ZapierService
      const formData = {
        selectedResponse: zapierData.confirmation_choice || 'No response',
        cancelReasons: zapierData.cancellation_reasons || [],
        otherReason: zapierData.other_reason || '',
        marketingConsent: zapierData.subscription_preference || '',
        englishImpact: '', // Not used in confirmation page
        preferredStartTime: zapierData.preferred_start_time || '',
        paymentReadiness: zapierData.payment_access || '',
        pricingResponse: '', // Not used in confirmation page
        name: zapierData.lead_name || '',
        email: zapierData.lead_email || '',
        campaignName: zapierData.campaign_name || '',
        adsetName: zapierData.adset_name || '',
        adName: zapierData.ad_name || '',
        fbClickId: zapierData.fb_click_id || '',
        sessionId: zapierData.session_id || '',
        trigger: zapierData.trigger || '',
        timestamp: zapierData.timestamp || new Date().toISOString(),
        totalSessionTime: zapierData.total_session_time || 0,
        events: zapierData.events || {},
        userAgent: zapierData.user_agent || navigator.userAgent,
        pageUrl: zapierData.page_url || window.location.href,
        formStarted: zapierData.form_started || false,
        formSubmitted: zapierData.form_submitted || false,
        formInteractionTime: zapierData.form_interaction_time || 0,
        description: zapierData.description || '' // Add description
      };

      console.log('📤 Sending to ZapierService with formatted description:', formData);
      console.log('🔍 Cancel reasons being sent:', formData.cancelReasons);
      
      // Check if this is a page unload scenario - use regular ZapierService for all devices
      if (zapierData.trigger === 'page_unload' || zapierData.trigger === 'page_hidden') {
        console.log('🚪 Page unloading - using regular ZapierService for all devices');
        // Use ZapierService directly (same as desktop)
        const response = await this.zapierService.sendToZapier(formData);
        console.log('✅ Successfully sent to Zapier via ZapierService:', response);
        return;
      }
      
      // Use ZapierService to send with proper description formatting
      const response = await this.zapierService.sendToZapier(formData);
      console.log('✅ Successfully sent to Zapier via ZapierService:', response);
      
    } catch (error) {
      console.error('❌ Error sending to Zapier via ZapierService:', error);
      // Fallback to old method if ZapierService fails
      console.log('🔄 Falling back to old sendToZapier method...');
      this.sendToZapier(zapierData);
    }
  }


  // Note: getAppointmentStatus logic is handled by ZapierService
  // This ensures consistent appointment status calculation across the app

  // Get appointment status for away analytics (same logic as ZapierService)
  private getAppointmentStatusForAway(selectedResponse: string, formSubmitted?: boolean, formStarted?: boolean): string {
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

  private formatFormDataForDescription(formData: any): string {
    let description = `Confirmation Page Analytics - User Left Page\n\n`;
    
    // User response section
    description += `User Response: ${formData.selectedResponse || 'No response'}\n`;
    description += `Appointment Status: Will be calculated by ZapierService based on form state\n\n`;
    
    // Show partial form data if they started but didn't complete
    if (formData.formStarted && !formData.formSubmitted) {
      description += `📝 PARTIAL FORM DATA (User started but didn't complete):\n`;
      
      if (formData.cancelReasons && formData.cancelReasons.length > 0) {
        description += `• Cancellation Reasons Selected: ${formData.cancelReasons.join(', ')}\n`;
      }
      
      if (formData.marketingConsent) {
        description += `• Marketing Consent: ${formData.marketingConsent}\n`;
      }
      
      if (formData.preferredStartTime) {
        description += `• Preferred Start Time: ${formData.preferredStartTime}\n`;
      }
      
      if (formData.paymentReadiness) {
        description += `• Payment Readiness: ${formData.paymentReadiness}\n`;
      }
      
      if (formData.otherReason) {
        description += `• Other Reason Details: ${formData.otherReason}\n`;
      }
      
      description += `\n⚠️ This user showed interest by starting the form but didn't complete it\n\n`;
    }
    
    // Session analytics
    description += `\nSession Analytics:\n`;
    description += `Session ID: ${formData.sessionId}\n`;
    description += `Total Session Time: ${this.formatTime(formData.totalSessionTime)}\n`;
    description += `Form Started: ${formData.formStarted ? 'Yes' : 'No'}\n`;
    description += `Form Submitted: ${formData.formSubmitted ? 'Yes' : 'No'}\n`;
    
    if (formData.formInteractionTime > 0) {
      description += `Form Interaction Time: ${this.formatTime(formData.formInteractionTime)}\n`;
    }
    
    // Section time analytics
    if (formData.events) {
      description += `\nTime Spent on Sections:\n`;
      Object.keys(formData.events).forEach(key => {
        if (key.includes('session_duration_on_') && formData.events[key] > 0) {
          const sectionName = key.replace('session_duration_on_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          description += `• ${sectionName}: ${this.formatTime(formData.events[key])}\n`;
        }
      });
      
      if (formData.events.session_idle_time_duration > 0) {
        description += `• Idle Time: ${this.formatTime(formData.events.session_idle_time_duration)}\n`;
      }
    }
    
    // Campaign data
    if (formData.campaignName || formData.adsetName || formData.adName) {
      description += `\nCampaign Tracking:\n`;
      if (formData.campaignName) description += `Campaign: ${formData.campaignName}\n`;
      if (formData.adsetName) description += `Adset: ${formData.adsetName}\n`;
      if (formData.adName) description += `Ad: ${formData.adName}\n`;
    }
    
    description += `\nTrigger: ${formData.trigger}\n`;
    description += `Submitted on: ${new Date().toLocaleString()}`;
    
    return description;
  }

  private sendToHotjar(events: any) {
    // This will be implemented when Hotjar is set up
    console.log('🔥 Would send to Hotjar:', events);
  }

  onImageError(event: any) {
    console.error('Image failed to load:', event.target.src);
    console.error('Error details:', event);
    // You can add fallback image logic here if needed
  }

  onImageLoad(event: any) {
    console.log('Image loaded successfully:', event.target.src);
    console.log('Image dimensions:', event.target.naturalWidth, 'x', event.target.naturalHeight);
  }

  // Checkbox handling
  onCancellationReasonChange(reason: string, isChecked: boolean) {
    console.log('🔍 onCancellationReasonChange called:', { reason, isChecked, formStarted: this.formStarted });
    
    if (isChecked) {
      this.selectedCancellationReasons.push(reason);
    } else {
      this.selectedCancellationReasons = this.selectedCancellationReasons.filter(r => r !== reason);
    }
    
    // Track when user starts filling the form
    if (!this.formStarted) {
      this.formStarted = true;
      this.formStartTime = Date.now();
      console.log('📝 Form started - User selected cancellation reason:', reason, 'at:', new Date(this.formStartTime));
    }
    
    console.log('🔍 Form state after cancellation reason change:', {
      selectedCancellationReasons: this.selectedCancellationReasons,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted
    });
  }

  isCancellationReasonSelected(reason: string): boolean {
    return this.selectedCancellationReasons.includes(reason);
  }

  // Radio button handling
  onSubscriptionChange(value: string) {
    console.log('🔍 onSubscriptionChange called:', { value, formStarted: this.formStarted });
    
    this.selectedSubscription = value;
    
    // Track when user starts filling the form
    if (!this.formStarted) {
      this.formStarted = true;
      this.formStartTime = Date.now();
      console.log('📝 Form started - User selected subscription:', value, 'at:', new Date(this.formStartTime));
    }
    
    console.log('🔍 Form state after subscription change:', {
      selectedSubscription: this.selectedSubscription,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted
    });
  }

  onStartTimeChange(value: string) {
    console.log('🔍 onStartTimeChange called:', { value, formStarted: this.formStarted });
    
    this.selectedStartTime = value;
    
    // Track when user starts filling the form
    if (!this.formStarted) {
      this.formStarted = true;
      this.formStartTime = Date.now();
      console.log('📝 Form started - User selected start time:', value, 'at:', new Date(this.formStartTime));
    }
    
    console.log('🔍 Form state after start time change:', {
      selectedStartTime: this.selectedStartTime,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted
    });
  }

  onPaymentChange(value: string) {
    console.log('🔍 onPaymentChange called:', { value, formStarted: this.formStarted });
    
    this.selectedPayment = value;
    
    // Track when user starts filling the form
    if (!this.formStarted) {
      this.formStarted = true;
      this.formStartTime = Date.now();
      console.log('📝 Form started - User selected payment:', value, 'at:', new Date(this.formStartTime));
    }
    
    console.log('🔍 Form state after payment change:', {
      selectedPayment: this.selectedPayment,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted
    });
  }

  onOtherReasonChange(value: string) {
    console.log('🔍 onOtherReasonChange called:', { value, formStarted: this.formStarted });
    
    this.otherCancellationReason = value;
    
    // Track when user starts filling the form
    if (!this.formStarted) {
      this.formStarted = true;
      this.formStartTime = Date.now();
      console.log('📝 Form started - User typed other reason:', value, 'at:', new Date(this.formStartTime));
    }
    
    console.log('🔍 Form state after other reason change:', {
      otherCancellationReason: this.otherCancellationReason,
      formStarted: this.formStarted,
      formSubmitted: this.formSubmitted
    });
  }

  // Modal methods
  openModal(imageSrc: string) {
    this.modalImageSrc = imageSrc;
    this.showModal = true;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.isTouching = false;
    this.initialTouchDistance = 0;
    this.initialZoomLevel = 1;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.showModal = false;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.isTouching = false;
    this.initialTouchDistance = 0;
    this.initialZoomLevel = 1;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  zoomIn() {
    if (this.zoomLevel < 5) {
      this.zoomLevel += 0.25;
    }
  }

  zoomOut() {
    if (this.zoomLevel > 0.5) {
      this.zoomLevel -= 0.25;
      // Reset pan when zooming out to fit
      if (this.zoomLevel <= 1) {
        this.panX = 0;
        this.panY = 0;
      }
    }
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
  }

  // Wheel zoom
  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(5, this.zoomLevel + delta));
    
    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom;
      // Reset pan when zooming out to fit
      if (this.zoomLevel <= 1) {
        this.panX = 0;
        this.panY = 0;
      }
    }
  }

  // Mouse drag for panning
  onMouseDown(event: MouseEvent) {
    if (this.zoomLevel > 1) {
      this.isDragging = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.zoomLevel > 1) {
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      
      this.panX += deltaX;
      this.panY += deltaY;
      
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      event.preventDefault();
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isDragging = false;
  }

  // Click to zoom in (only when not dragging)
  onImageClick(event: MouseEvent) {
    if (!this.isDragging && this.zoomLevel === 1) {
      this.zoomIn();
    }
  }

  // Touch to zoom in (only when not touching and at default zoom)
  onImageTouchStart(event: TouchEvent) {
    if (!this.isTouching && this.zoomLevel === 1 && event.touches.length === 1) {
      // Single tap to zoom in
      setTimeout(() => {
        if (!this.isTouching) {
          this.zoomIn();
        }
      }, 100);
    }
  }

  // Touch event handlers
  onTouchStart(event: TouchEvent) {
    event.preventDefault();
    const touches = event.touches;
    
    if (touches.length === 1) {
      // Single touch - start panning
      this.isTouching = true;
      this.lastTouchX = touches[0].clientX;
      this.lastTouchY = touches[0].clientY;
    } else if (touches.length === 2) {
      // Two touches - start pinch zoom
      this.isTouching = true;
      this.initialTouchDistance = this.getTouchDistance(touches[0], touches[1]);
      this.initialZoomLevel = this.zoomLevel;
    }
  }

  onTouchMove(event: TouchEvent) {
    event.preventDefault();
    const touches = event.touches;
    
    if (touches.length === 1 && this.isTouching && this.zoomLevel > 1) {
      // Single touch - panning
      const deltaX = touches[0].clientX - this.lastTouchX;
      const deltaY = touches[0].clientY - this.lastTouchY;
      
      this.panX += deltaX;
      this.panY += deltaY;
      
      this.lastTouchX = touches[0].clientX;
      this.lastTouchY = touches[0].clientY;
    } else if (touches.length === 2 && this.isTouching) {
      // Two touches - pinch zoom
      const currentDistance = this.getTouchDistance(touches[0], touches[1]);
      const scale = currentDistance / this.initialTouchDistance;
      const newZoom = Math.max(0.5, Math.min(5, this.initialZoomLevel * scale));
      
      this.zoomLevel = newZoom;
      
      // Reset pan when zooming out to fit
      if (this.zoomLevel <= 1) {
        this.panX = 0;
        this.panY = 0;
      }
    }
  }

  onTouchEnd(event: TouchEvent) {
    this.isTouching = false;
    this.initialTouchDistance = 0;
    this.initialZoomLevel = 1;
  }

  // Helper method to calculate distance between two touch points
  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }


  // Pricing section timer methods
  startPricingTimer() {
    if (this.pricingSectionVisible && this.pricingStartTime === 0) {
      this.pricingStartTime = Date.now();
      console.log('Started pricing timer at:', new Date(this.pricingStartTime));
    }
    
    // Keep the original popup logic
    if (!this.hasShownPricingPopup && this.pricingSectionVisible) {
      this.pricingTimer = setTimeout(() => {
        if (this.pricingSectionVisible && !this.hasShownPricingPopup) {
          this.showPricingPopup = true;
          this.hasShownPricingPopup = true;
          // Prevent body scroll when popup is open
          document.body.style.overflow = 'hidden';
        }
      }, 20000); // 20 seconds
    }
  }

  stopPricingTimer() {
    if (this.pricingStartTime > 0) {
      this.pricingEndTime = Date.now();
      const sessionTime = this.pricingEndTime - this.pricingStartTime;
      this.totalPricingTime += sessionTime;
      console.log('Stopped pricing timer. Session time:', sessionTime, 'ms. Total time:', this.totalPricingTime, 'ms');
      this.pricingStartTime = 0; // Reset for next session
    }
    
    // Keep the original timer clearing logic
    if (this.pricingTimer) {
      clearTimeout(this.pricingTimer);
      this.pricingTimer = null;
    }
  }

  closePricingPopup() {
    this.showPricingPopup = false;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  onPlanSelect(plan: string) {
    // Capture the selected plan
    this.selectedPlan = plan;
    
    // Calculate section view time in seconds
    const sectionViewTimeMs = this.pricingStartTime > 0 ? Date.now() - this.pricingStartTime : 0;
    const sectionViewTime = Math.round(sectionViewTimeMs / 1000); // Convert to seconds
    
    // Prepare form data for future submission
    this.planSelectionData = {
      plan: plan,
      timestamp: new Date().toISOString(),
      sectionViewTime: sectionViewTime,
      userAgent: navigator.userAgent,
      pageUrl: window.location.href,
      formType: 'pricing_plan_selection'
    };
    
    // Log the captured data (for now)
    console.log('Plan Selection Form Data:', this.planSelectionData);
    
    // TODO: Send data to your backend/analytics service
    // this.sendPlanSelectionData(this.planSelectionData);
    
    this.closePricingPopup();
  }

  // Future method to send data (ready for implementation)
  private sendPlanSelectionData(data: any) {
    // This method is ready for when you want to send the data
    // Example implementations:
    
    // Option 1: Send to your backend API
    // return this.http.post('/api/plan-selection', data).subscribe();
    
    // Option 2: Send to analytics service
    // gtag('event', 'plan_selection', data);
    
    // Option 3: Send to CRM
    // this.crmService.trackPlanSelection(data);
    
    console.log('Data ready to be sent:', data);
  }

  // Verification page methods
  closeVerificationPage() {
    this.showVerificationPage = false;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  onNameChange(name: string) {
    this.userSelections.name = name;
  }

  async proceedToWhatsApp() {
    // Mark form as submitted when user completes the form
    this.formSubmitted = true;
    console.log('✅ Form submitted - User completed the form via proceedToWhatsApp');
    
    // Debug: Log name before processing
    console.log('🔍 proceedToWhatsApp name debug:', {
      urlParamsName: this.urlParams.name,
      userSelectionsName: this.userSelections.name
    });
    
    // Name is automatically filled from URL parameters, so we don't need to validate it
    // If no name from URL, use a default
    if (!this.userSelections.name || !this.userSelections.name.trim()) {
      this.userSelections.name = this.urlParams.name || 'عميل';
      console.log('🔧 Name fallback applied:', this.userSelections.name);
    }

    // Send data for session (only once per session)
    this.sendDataForSession('user_confirmed_whatsapp');

    // Handle cancellation - show thanks message instead of WhatsApp
    if (this.userSelections.choice === 'cancel') {
      this.closeVerificationPage();
      this.showThanksMessage(true); // Pass true to indicate this is a cancellation
      this.resetFormValues(); // Reset form after submission
      return;
    }

    // Handle confirmation - always go to WhatsApp
    if (this.userSelections.choice === 'confirm') {
      console.log('📤 Webhook calls completed, proceeding to WhatsApp...');
      // Always go to WhatsApp for confirmations (regardless of payment method)
      this.goToWhatsApp();
      this.resetFormValues(); // Reset form after submission
    }
  }

  private goToWhatsApp() {
    // Use name directly from URL parameters
    const nameFromUrl = this.urlParams.name || 'عميل';
    
    console.log('🔍 WhatsApp name from URL:', nameFromUrl);
    
    // Generate personalized message using the new Arabic template
    const message = `مرحباً هالة، 
 أتمنى أن تكوني بخير
 اسمي ${nameFromUrl} وقد أكدتُ رغبتي في حضور دروس اللغة الإنجليزية. أرجو مساعدتي في إكمال عملية التسجيل `;

    // Hala's WhatsApp number: +1 (647) 365-4860
    const halaNumber = '16473654860'; // Remove spaces and special characters
    const whatsappUrl = `https://wa.me/${halaNumber}?text=${encodeURIComponent(message)}`;
    
    // Close verification page and open WhatsApp
    this.closeVerificationPage();
    window.open(whatsappUrl, '_blank');
  }

  private showThanksMessage(isCancellation: boolean = false) {
    console.log('🔍 showThanksMessage - isCancellation:', isCancellation, 'selectedChoice:', this.selectedChoice);
    
    // Check if this is a cancellation to show success page
    if (isCancellation || this.selectedChoice === 'cancel') {
      console.log('🎯 Showing cancellation success page');
      this.showCancellationSuccess = true;
      // Send data for session after showing cancellation success
      this.sendDataForSession('user_cancelled');
      // Don't reset form values here - let closeCancellationSuccess() handle it when modal is closed
    } else {
      console.log('🎯 Showing regular thanks modal');
      // Show thanks message modal for other cases
      this.showThanksModal = true;
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Send data for session
      this.sendDataForSession('user_confirmed');
      // Reset form values after showing thanks message
      this.resetFormValues();
    }
  }

  getCancellationReasonText(reason: string): string {
    const reasons: { [key: string]: string } = {
      'Price': 'السعر مرتفع جداً',
      'Timing': 'الجداول الزمنية غير مناسبة',
      'Schedule': 'جدول أعمالي لا يسمح',
      'Payment': 'شكوك بشأن أمان الدفع',
      'Prefer Inperson': 'أفضل الدروس الحضورية',
      'other': 'سبب آخر'
    };
    return reasons[reason] || reason;
  }

  getStartTimeText(startTime: string): string {
    const times: { [key: string]: string } = {
      'now': 'الآن',
      'nextWeek': 'الأسبوع القادم',
      'nextMonth': 'الشهر القادم',
      'comingMonths': 'خلال الأشهر القادمة'
    };
    return times[startTime] || startTime;
  }

  getPaymentText(payment: string): string {
    const payments: { [key: string]: string } = {
      'yesUsed': 'أستطيع الوصول إلى طرق الدفع',
      'noNoHelp': 'لا أستطيع الوصول إلى طرق الدفع'
    };
    return payments[payment] || payment;
  }

  // Convert technical values to readable English for Zapier submission
  getStartTimeEnglish(startTime: string): string {
    const times: { [key: string]: string } = {
      'now': 'Now',
      'nextWeek': 'Next Week',
      'nextMonth': 'Next Month',
      'comingMonths': 'Coming Months'
    };
    return times[startTime] || startTime;
  }

  getPaymentEnglish(payment: string): string {
    const payments: { [key: string]: string } = {
      'yesUsed': 'Yes, I am able to access payment methods',
      'noNoHelp': 'No, I am not able to access payment methods'
    };
    return payments[payment] || payment;
  }

  getChoiceEnglish(choice: string): string {
    const choices: { [key: string]: string } = {
      'confirm': 'Confirm Interest',
      'cancel': 'Cancel'
    };
    return choices[choice] || choice;
  }

  getCancellationReasonsEnglish(reasons: string[]): string[] {
    const reasonMap: { [key: string]: string } = {
      'price': 'Price is too high',
      'timing': 'Timing is not suitable',
      'schedule': 'My schedule does not allow',
      'payment': 'Doubts about payment security',
      'prefer-inperson': 'I prefer in-person lessons',
      'other': 'Other reason'
    };
    
    return reasons.map(reason => {
      if (reason === 'other' && this.otherCancellationReason && this.otherCancellationReason.trim()) {
        return `Other reason: ${this.otherCancellationReason.trim()}`;
      }
      return reasonMap[reason] || reason;
    });
  }

  // Validation methods
  showValidationErrorModal(message: string) {
    this.validationMessage = message;
    this.showValidationError = true;
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  closeValidationError() {
    this.showValidationError = false;
    this.validationMessage = '';
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  validateName() {
    const name = this.userSelections.name?.trim() || '';
    if (!name) {
      this.nameError = true;
      this.nameErrorMessage = 'الاسم مطلوب';
    } else if (name.length < 2) {
      this.nameError = true;
      this.nameErrorMessage = 'الاسم يجب أن يكون على الأقل حرفين';
    } else {
      this.nameError = false;
      this.nameErrorMessage = '';
    }
  }

  clearNameError() {
    this.nameError = false;
    this.nameErrorMessage = '';
  }

  closeThanksModal() {
    this.showThanksModal = false;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  // Close cancellation success modal and reset form
  closeCancellationSuccess() {
    this.showCancellationSuccess = false;
    this.resetFormValues();
  }


  // Pricing time validation methods
  closePricingTimeValidation() {
    this.showPricingTimeValidation = false;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  proceedWithoutCheckingPrices() {
    console.log('🔍 proceedWithoutCheckingPrices - selectedChoice:', this.selectedChoice);
    this.closePricingTimeValidation();
    // Continue with the original form submission logic
    this.continueWithFormSubmission();
  }

  goBackToCheckPrices() {
    this.closePricingTimeValidation();
    // Scroll to pricing section
    const pricingSection = document.querySelector('#pricing-section');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private continueWithFormSubmission() {
    // Mark form as submitted when user starts the submission process
    this.formSubmitted = true;
    console.log('✅ Form submitted - User completed the form');
    console.log('🔍 continueWithFormSubmission - selectedChoice:', this.selectedChoice);
    
    // If user cancels, show thanks message directly
    if (this.selectedChoice === 'cancel') {
      console.log('🎯 User cancelled - showing cancellation success page');
      this.showThanksMessage(true); // Pass true to indicate this is a cancellation
      // Don't reset form values here - let showThanksMessage handle it
      return;
    }
    
    // For confirmations, collect all user selections and show verification page
    this.userSelections = {
      choice: this.selectedChoice,
      cancellationReasons: this.selectedCancellationReasons,
      subscription: this.selectedSubscription,
      startTime: this.selectedStartTime,
      payment: this.selectedPayment,
      name: this.urlParams.name || '' // Use name from URL parameters
    };
    
    // Show verification page
    this.showVerificationPage = true;
    // Prevent body scroll when verification page is open
    document.body.style.overflow = 'hidden';
  }

  // Reset all form values to their default state
  private resetFormValues() {
    this.selectedChoice = '';
    this.selectedCancellationReasons = [];
    this.selectedSubscription = '';
    this.selectedStartTime = '';
    this.selectedPayment = '';
    this.selectedPlan = '';
    this.otherCancellationReason = '';
    
    // Reset user selections
    this.userSelections = {
      choice: '',
      cancellationReasons: [],
      subscription: '',
      startTime: '',
      payment: '',
      name: ''
    };
    
    // Reset form state
    this.formStarted = false;
    this.formSubmitted = false;
    this.formStartTime = 0;
    
    // Reset modal states
    this.showCancellationSuccess = false;
    this.showThanksModal = false;
    
    console.log('🔄 Form values reset to default state');
  }

  // Idle popup methods
  closeIdlePopup() {
    this.showIdlePopup = false;
    document.body.style.overflow = 'auto';
    
    // Clear the popup timer since user interacted
    if (this.idlePopupTimer) {
      clearTimeout(this.idlePopupTimer);
      this.idlePopupTimer = null;
    }
    
    // Reset the idle timer to start fresh
    this.startSimpleIdleTracking();
    console.log('💬 Idle popup closed - user is active again');
  }

  stayOnPage() {
    this.closeIdlePopup();
    
    // Reset idle timer when user chooses to stay
    this.startSimpleIdleTracking();
    
    console.log('💬 User chose to stay on page - idle timer reset');
  }

  leavePage() {
    console.log('🔍 leavePage() called');
    
    // Show thank you screen FIRST
    this.showThankYouScreen = true;
    document.body.style.overflow = 'hidden';
    
    // Close idle popup
    this.closeIdlePopup();
    
    // Send data for session (only once per session)
    this.sendDataForSession('user_idle_leave');
    
    console.log('💬 User chose to leave page - showing thank you screen');
    console.log('🔍 showThankYouScreen value:', this.showThankYouScreen);
  }




  private sendSessionDataToZapier() {
    // Determine user interaction level
    let interactionLevel = 'no_interaction';
    if (this.formSubmitted) {
      interactionLevel = 'form_submitted';
    } else if (this.formStarted) {
      interactionLevel = 'form_started';
    }

    // Calculate form interaction time
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds)
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    // Prepare session data for Zapier
    const sessionData = {
      // Lead identification (from previous form)
      lead_email: this.urlParams.email,
      lead_name: this.urlParams.name,
      
      // Campaign tracking data
      campaign_name: this.urlParams.campaignName,
      adset_name: this.urlParams.adsetName,
      ad_name: this.urlParams.adName,
      fb_click_id: this.urlParams.fbClickId,
      
      // Session data
      session_id: this.sessionId,
      trigger: 'idle_popup_leave',
      timestamp: new Date().toISOString(),
      total_session_time: Math.round((Date.now() - this.sessionStartTime) / 1000),
      interaction_level: interactionLevel,
      events: events,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      
      // Form interaction data
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime,
      
      // User choice data (if any)
      selected_choice: this.selectedChoice || 'no_choice',
      cancellation_reasons: this.selectedCancellationReasons,
      subscription_preference: this.selectedSubscription,
      preferred_start_time: this.selectedStartTime,
      payment_method_available: this.selectedPayment
    };

    console.log('📊 Sending session data to Zapier:', sessionData);
    
    // Send to Zapier webhook
    this.sendToZapier(sessionData);
  }

  // Check if confirm form is valid (both start time and payment method selected)
  isConfirmFormValid(): boolean {
    return this.selectedChoice === 'confirm' && 
           this.selectedStartTime !== '' && 
           this.selectedPayment !== '';
  }

  // Check if cancel form is valid (at least one cancellation reason selected and subscription preference chosen)
  isCancelFormValid(): boolean {
    return this.selectedChoice === 'cancel' && 
           this.selectedCancellationReasons.length > 0 && 
           this.selectedSubscription !== '';
  }
}
