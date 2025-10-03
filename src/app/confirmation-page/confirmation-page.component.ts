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
  private readonly isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
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
    idleThreshold: 180000 // 180 seconds total inactivity
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
    this.setupIdleTracking();
    this.setupPageUnloadTracking();
    this.setupBackgroundTracking();
    this.setupScrollDetection();
    
    // Test Zapier connection on page load
    this.testZapierConnection();
    
    // Start the 180-second timer
    this.resetIdleTimer();
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
    
    // Send tracking data before component is destroyed (page closing)
    this.sendTrackingData('page_closing');
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

  private setupIdleTracking() {
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.resetIdleTimer();
      }, true);
    });
    
    // Also track when user is actively viewing sections (reading content)
    // This helps distinguish between reading and actual idle time
    this.setupReadingActivityTracking();
  }

  private setupReadingActivityTracking() {
    // Track when user is actively viewing sections
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // User is actively viewing a section - consider this as activity
          this.resetIdleTimer();
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

  private resetIdleTimer() {
    // Don't reset timer if idle popup is already showing or thank you screen is showing
    if (this.showIdlePopup || this.showThankYouScreen) {
      return;
    }
    
    // Update last activity time
    this.idleTime.lastActivity = Date.now();
    
    // Clear existing timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.idlePopupTimer) {
      clearTimeout(this.idlePopupTimer);
    }
    
    // Set new 90-second timer to show popup
    if (!this.showThankYouScreen) {
      console.log('🔄 Starting 90-second timer for popup');
      this.idleTimer = setTimeout(() => {
        this.showIdlePopup = true;
        document.body.style.overflow = 'hidden';
        console.log('💬 Showing idle popup - asking if user is still there');
        
        // Start another 90-second timer for popup interaction
        this.idlePopupTimer = setTimeout(() => {
          console.log('⏰ 180 seconds total inactivity - sending analytics automatically');
          this.sendTrackingData('idle_timeout_180_seconds');
        }, 90000); // Another 90 seconds
      }, 90000); // 90 seconds to show popup
    }
  }

  private setupPageUnloadTracking() {
    window.addEventListener('beforeunload', () => {
      console.log('🚪 Page unloading - sending tracking data');
      this.storeIdleState(); // Store state before sending data
      this.sendTrackingData('page_unload');
    });
    
    // Handle page visibility changes (tab switching, app switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('👋 User left tab');
      } else {
        console.log('👋 User returned to tab - checking if 180 seconds passed');
        this.checkIf180SecondsPassed();
      }
    });
  }

  private storeIdleState() {
    const idleState = {
      lastActivity: this.idleTime.lastActivity,
      total: this.idleTime.total,
      isIdle: this.idleTime.isIdle,
      popupShownAt: this.idleTime.popupShownAt,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };
    
    try {
      localStorage.setItem('nevys_idle_state', JSON.stringify(idleState));
      console.log('💾 Idle state stored:', idleState);
    } catch (e) {
      console.warn('⚠️ Could not store idle state:', e);
    }
  }

  private restoreIdleState() {
    try {
      const stored = localStorage.getItem('nevys_idle_state');
      if (!stored) return;
      
      const idleState = JSON.parse(stored);
      
      // Only restore if it's the same session
      if (idleState.sessionId !== this.sessionId) {
        localStorage.removeItem('nevys_idle_state');
        return;
      }
      
      const now = Date.now();
      const timeAway = now - idleState.timestamp;
      
      console.log('🔄 Restoring idle state:', {
        timeAway: timeAway,
        wasIdle: idleState.isIdle,
        storedLastActivity: idleState.lastActivity
      });
      
      // If user was idle when they left, add the time away to total idle time
      if (idleState.isIdle) {
        this.idleTime.total = idleState.total + timeAway;
        this.idleTime.popupShownAt = idleState.popupShownAt;
        console.log('⏰ User was idle when they left - adding time away to total');
        
        // Check if popup was shown and if 90 seconds have passed since then
        if (idleState.popupShownAt) {
          const timeSincePopup = now - idleState.popupShownAt;
          if (timeSincePopup >= this.idleTime.idleThreshold) {
            // 180 seconds total inactivity - send analytics immediately
            console.log('⏰ 180 seconds total inactivity detected - sending analytics immediately');
            this.sendTrackingData('idle_timeout_180_seconds');
            return;
          } else {
            // Show popup and continue timer
            this.showIdlePopup = true;
            document.body.style.overflow = 'hidden';
            const remainingTime = this.idleTime.idleThreshold - timeSincePopup;
            this.idlePopupTimer = setTimeout(() => {
              console.log('⏰ 180 seconds total inactivity - sending analytics automatically');
              this.sendTrackingData('idle_timeout_180_seconds');
            }, remainingTime);
            console.log('💬 User returned while popup was active - continuing timer');
          }
        }
      } else {
        // If user wasn't idle, check if they've been away long enough to be considered idle
        const totalInactiveTime = now - idleState.lastActivity;
        if (totalInactiveTime >= this.idleTime.idleThreshold) {
          // They've been inactive long enough - show popup immediately
          this.idleTime.isIdle = true;
          this.idleTime.total = idleState.total + (totalInactiveTime - this.idleTime.idleThreshold);
          this.showIdlePopup = true;
          document.body.style.overflow = 'hidden';
          console.log('💬 User returned after long inactivity - showing popup immediately');
          
          // Start popup timer for additional 90 seconds
          this.idlePopupTimer = setTimeout(() => {
            console.log('⏰ 180 seconds total inactivity - sending analytics automatically');
            this.sendTrackingData('idle_timeout_180_seconds');
          }, this.idleTime.idleThreshold);
        } else {
          // Not idle yet - continue normal tracking
          this.idleTime.lastActivity = idleState.lastActivity;
          this.idleTime.total = idleState.total;
          this.resetIdleTimer();
        }
      }
      
      // Clean up stored state
      localStorage.removeItem('nevys_idle_state');
      
    } catch (e) {
      console.warn('⚠️ Could not restore idle state:', e);
      localStorage.removeItem('nevys_idle_state');
    }
  }

  private checkStoredIdleTimeout() {
    try {
      const stored = localStorage.getItem('nevys_idle_state');
      if (!stored) return;
      
      const idleState = JSON.parse(stored);
      
      // Only check if it's the same session
      if (idleState.sessionId !== this.sessionId) {
        localStorage.removeItem('nevys_idle_state');
        return;
      }
      
      const now = Date.now();
      
      // Check if popup was shown and if 90 seconds have passed since then
      if (idleState.popupShownAt) {
        const timeSincePopup = now - idleState.popupShownAt;
        if (timeSincePopup >= this.idleTime.idleThreshold) {
          // 180 seconds total inactivity - send analytics immediately
          console.log('⏰ 180 seconds total inactivity detected on page load - sending analytics immediately');
          this.sendTrackingData('idle_timeout_180_seconds');
          localStorage.removeItem('nevys_idle_state');
          return;
        }
      }
      
    } catch (e) {
      console.warn('⚠️ Could not check stored idle timeout:', e);
      localStorage.removeItem('nevys_idle_state');
    }
  }

  private setupMobileSafariBackup() {
    // Simple backup: Check if 180 seconds have passed when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👋 Tab became visible - checking if 180 seconds passed');
        this.checkIf180SecondsPassed();
      }
    });
    
    // Also check on page focus
    window.addEventListener('focus', () => {
      console.log('👋 Page focused - checking if 180 seconds passed');
      this.checkIf180SecondsPassed();
    });
  }

  private checkIf180SecondsPassed() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.idleTime.lastActivity;
    
    console.log('🔍 Checking if 180 seconds passed:', {
      timeSinceLastActivity: timeSinceLastActivity,
      threshold: 180000,
      shouldSend: timeSinceLastActivity >= 180000
    });
    
    if (timeSinceLastActivity >= 180000) {
      console.log('⏰ 180 seconds total inactivity detected - sending analytics');
      this.sendTrackingData('idle_timeout_180_seconds');
    } else if (timeSinceLastActivity >= 90000) {
      // Show popup if 90 seconds have passed
      if (!this.showIdlePopup) {
        this.showIdlePopup = true;
        document.body.style.overflow = 'hidden';
        console.log('💬 Showing idle popup - asking if user is still there');
        
        // Start timer for popup interaction
        this.idlePopupTimer = setTimeout(() => {
          console.log('⏰ 180 seconds total inactivity - sending analytics automatically');
          this.sendTrackingData('idle_timeout_180_seconds');
        }, 90000); // Another 90 seconds
      }
    }
  }

  private setupBackgroundTracking() {
    // Store the page load time for timestamp-based tracking
    const pageLoadTime = Date.now();
    localStorage.setItem('nevys_page_load_time', pageLoadTime.toString());
    localStorage.setItem('nevys_session_id', this.sessionId);
    
    console.log('💾 Stored page load time:', new Date(pageLoadTime).toISOString());

    // Check when user returns to tab
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👋 User returned to tab - checking timestamp');
        this.checkTimestampAndSendIfNeeded();
      }
    });

    // Also check on page focus
    window.addEventListener('focus', () => {
      console.log('👋 Page focused - checking timestamp');
      this.checkTimestampAndSendIfNeeded();
    });

    // AGGRESSIVE: Check every 10 seconds using timestamp
    setInterval(() => {
      this.checkTimestampAndSendIfNeeded();
    }, 10000);
  }

  private checkTimestampAndSendIfNeeded() {
    try {
      const stored = localStorage.getItem('nevys_page_load_time');
      const sessionId = localStorage.getItem('nevys_session_id');
      
      if (!stored || sessionId !== this.sessionId) return;
      
      const pageLoadTime = parseInt(stored);
      const now = Date.now();
      const timeSincePageLoad = now - pageLoadTime;
      
      console.log('🕐 Timestamp check:', {
        pageLoadTime: new Date(pageLoadTime).toISOString(),
        now: new Date(now).toISOString(),
        timeSincePageLoad: timeSincePageLoad,
        threshold: 180000,
        shouldSend: timeSincePageLoad >= 180000
      });
      
      if (timeSincePageLoad >= 180000) {
        console.log('⏰ Timestamp: 180 seconds since page load - sending analytics');
        this.sendIdleAnalytics();
        localStorage.removeItem('nevys_page_load_time');
        localStorage.removeItem('nevys_session_id');
      }
    } catch (e) {
      console.warn('⚠️ Could not check timestamp:', e);
    }
  }

  private sendIdleAnalytics() {
    // Send analytics directly to Zapier using the same approach as the service
    const webhookUrl = 'https://hooks.zapier.com/hooks/catch/4630879/u1m4k02/';
    
    // Prepare the data
    const params = new URLSearchParams();
    params.set('trigger', 'idle_timeout_180_seconds');
    params.set('sessionId', this.sessionId);
    params.set('timestamp', new Date().toISOString());
    params.set('name', this.urlParams.name || '');
    params.set('email', this.urlParams.email || '');
    params.set('campaignName', this.urlParams.campaignName || '');
    params.set('adsetName', this.urlParams.adsetName || '');
    params.set('adName', this.urlParams.adName || '');
    params.set('fbClickId', this.urlParams.fbClickId || '');
    params.set('userAgent', navigator.userAgent);
    params.set('pageUrl', window.location.href);
    
    const fullUrl = `${webhookUrl}?${params.toString()}`;
    
    console.log('📡 Sending idle analytics to Zapier:', fullUrl);
    
    // Use fetch with keepalive for reliable transmission
    fetch(fullUrl, { 
      method: 'GET', 
      keepalive: true 
    })
    .then(response => {
      if (response.ok) {
        console.log('✅ Idle analytics sent successfully');
      } else {
        console.error('❌ Idle analytics failed:', response.status);
      }
    })
    .catch(error => {
      console.error('❌ Idle analytics error:', error);
    });
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

  // Keep the old method for backward compatibility with tracking data
  private sendToZapier(data: any) {
    // In development mode, just log the data without making API calls
    if (this.isDevelopment) {
      console.log('🔧 Development mode (localhost): Logging analytics data (no Zapier API call)');
      console.log('📊 Analytics data that would be sent:');
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    // Use the webhook URL from the service
    const webhookUrl = 'https://hooks.zapier.com/hooks/catch/4630879/u1m4k02/';
    
    // Log the data being sent for debugging
    console.log('📤 Attempting to send data to Zapier:', data);
    
    // Send data to Zapier webhook
    this.sendToZapierWebhook(webhookUrl, data);
  }

  private sendToZapierWebhook(webhookUrl: string, data: any) {
    console.log('🔗 Sending to webhook URL:', webhookUrl);
    
    // Send data to Zapier webhook as GET with query parameters (CORS-friendly)
    const params = new URLSearchParams();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        if (typeof data[key] === 'object') {
          params.set(key, JSON.stringify(data[key]));
        } else {
          params.set(key, data[key].toString());
        }
      }
    });
    
    fetch(`${webhookUrl}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors'
    })
    .then(response => {
      if (response.ok) {
        console.log('✅ Successfully sent to Zapier:', data);
        console.log('📊 Data sent as query parameters:', params.toString());
        console.log('🔗 Webhook URL used:', webhookUrl);
        console.log('📋 Response status:', response.status);
        console.log('📋 Response headers:', response.headers);
      } else {
        console.error('❌ Failed to send to Zapier:', response.status, response.statusText);
      }
    })
    .catch(error => {
      console.error('❌ Error sending to Zapier:', error);
    });
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
        formInteractionTime: zapierData.form_interaction_time || 0
      };

      console.log('📤 Sending to ZapierService with formatted description:', formData);
      console.log('🔍 Cancel reasons being sent:', formData.cancelReasons);
      
      // Check if this is a page unload scenario and use sendBeacon for reliability
      if (zapierData.trigger === 'page_unload' || zapierData.trigger === 'page_hidden') {
        console.log('🚪 Page unloading - using sendBeacon for reliable data transmission');
        this.sendToZapierWithBeacon(formData);
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

  private sendToZapierWithBeacon(formData: any) {
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
      
      // Form responses
      params.set('response_type', formData.selectedResponse);
      
      if (formData.cancelReasons && formData.cancelReasons.length > 0) {
        params.set('cancel_reasons', formData.cancelReasons.join(', '));
      } else {
        params.set('cancel_reasons', '');
      }
      
      if (formData.otherReason) {
        params.set('other_reason', formData.otherReason);
      }
      params.set('marketing_consent', formData.marketingConsent);
      params.set('english_impact', formData.englishImpact);
      params.set('preferred_start_time', formData.preferredStartTime);
      params.set('payment_readiness', formData.paymentReadiness);
      
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
      const description = this.formatFormDataForDescription(formData);
      params.set('description', description);
      params.set('notes', description);
      params.set('comments', description);
      
      const webhookUrl = 'https://hooks.zapier.com/hooks/catch/4630879/u1m4k02/';
      const fullUrl = `${webhookUrl}?${params.toString()}`;
      
      console.log('📡 Using sendBeacon for reliable data transmission:', fullUrl);
      
      // Use sendBeacon for reliable transmission during page unload
      const success = navigator.sendBeacon(fullUrl);
      
      if (success) {
        console.log('✅ Data sent successfully via sendBeacon');
      } else {
        console.warn('⚠️ sendBeacon failed, trying fallback method');
        // Fallback to regular fetch
        fetch(fullUrl, { method: 'GET', keepalive: true })
          .then(response => {
            if (response.ok) {
              console.log('✅ Fallback method succeeded');
            } else {
              console.error('❌ Fallback method failed:', response.status);
            }
          })
          .catch(error => {
            console.error('❌ Fallback method error:', error);
          });
      }
      
    } catch (error) {
      console.error('❌ Error in sendToZapierWithBeacon:', error);
    }
  }

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
          return 'Started form but dropped out';
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
    description += `Appointment Status: ${this.getAppointmentStatus(formData.selectedResponse, formData.formSubmitted, formData.formStarted) || 'Not set (user didn\'t complete form)'}\n\n`;
    
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
    if (isChecked) {
      this.selectedCancellationReasons.push(reason);
    } else {
      this.selectedCancellationReasons = this.selectedCancellationReasons.filter(r => r !== reason);
    }
  }

  isCancellationReasonSelected(reason: string): boolean {
    return this.selectedCancellationReasons.includes(reason);
  }

  // Radio button handling
  onSubscriptionChange(value: string) {
    this.selectedSubscription = value;
  }

  onStartTimeChange(value: string) {
    this.selectedStartTime = value;
  }

  onPaymentChange(value: string) {
    this.selectedPayment = value;
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

  proceedToWhatsApp() {
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

    // Send form data using the new successful Zapier service
    this.sendFormDataToZapier();

    // Send analytics data for final action (keep existing tracking)
    this.sendLeadUpdateToZapier();

    // Handle cancellation - show thanks message instead of WhatsApp
    if (this.userSelections.choice === 'cancel') {
      this.closeVerificationPage();
      this.showThanksMessage(true); // Pass true to indicate this is a cancellation
      this.resetFormValues(); // Reset form after submission
      return;
    }

    // Handle confirmation - always go to WhatsApp
    if (this.userSelections.choice === 'confirm') {
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
    
    // Try to send form data using the new successful Zapier service
    // Wrap in try-catch to prevent errors from breaking the UI
    try {
      this.sendFormDataToZapier();
      this.sendLeadUpdateToZapier();
    } catch (error) {
      console.error('⚠️ Zapier integration failed, continuing with UI:', error);
    }
    
    // Check if this is a cancellation to show success page
    if (isCancellation || this.selectedChoice === 'cancel') {
      console.log('🎯 Showing cancellation success page');
      this.showCancellationSuccess = true;
      // Don't reset form values here - let closeCancellationSuccess() handle it when modal is closed
    } else {
      console.log('🎯 Showing regular thanks modal');
      // Show thanks message modal for other cases
      this.showThanksModal = true;
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
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
    
    // Send lead update data to Zapier
    this.sendLeadUpdateToZapier();
    
    // Send tracking data when form submission starts
    this.sendTrackingData('form_submission_start');
    
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
    this.resetIdleTimer();
    console.log('💬 Idle popup closed - user is active again');
  }

  stayOnPage() {
    this.closeIdlePopup();
    
    // Reset idle timer when user chooses to stay
    this.resetIdleTimer();
    
    console.log('💬 User chose to stay on page - idle timer reset');
  }

  leavePage() {
    console.log('🔍 leavePage() called');
    
    // Show thank you screen FIRST
    this.showThankYouScreen = true;
    document.body.style.overflow = 'hidden';
    
    // Close idle popup
    this.closeIdlePopup();
    
    // Send session data to Zapier if not already sent
    if (!this.sessionDataSent) {
      this.sendSessionDataToZapier();
      this.sessionDataSent = true;
    }
    
    console.log('💬 User chose to leave page - showing thank you screen');
    console.log('🔍 showThankYouScreen value:', this.showThankYouScreen);
  }

  private storePopupWhileAway() {
    try {
      const popupWhileAwayData = {
        popupShownAt: this.idleTime.popupShownAt,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        userLeftWhilePopupShowing: true
      };
      
      localStorage.setItem('nevys_popup_while_away', JSON.stringify(popupWhileAwayData));
      console.log('💾 Stored popup while away data:', popupWhileAwayData);
    } catch (e) {
      console.warn('⚠️ Could not store popup while away data:', e);
    }
  }

  private checkPopupWhileAway() {
    try {
      const stored = localStorage.getItem('nevys_popup_while_away');
      if (!stored) return;
      
      const popupData = JSON.parse(stored);
      
      // Only check if it's the same session
      if (popupData.sessionId !== this.sessionId) {
        localStorage.removeItem('nevys_popup_while_away');
        return;
      }
      
      const now = Date.now();
      const timeSincePopup = now - popupData.popupShownAt;
      
      console.log('🔍 Checking popup shown while away:', {
        timeSincePopup: timeSincePopup,
        threshold: this.idleTime.idleThreshold,
        shouldSend: timeSincePopup >= this.idleTime.idleThreshold
      });
      
      if (timeSincePopup >= this.idleTime.idleThreshold) {
        // 180 seconds total inactivity - send analytics immediately
        console.log('⏰ Popup while away: 180 seconds total inactivity - sending analytics immediately');
        this.sendTrackingData('idle_timeout_180_seconds');
        this.showIdlePopup = false;
        document.body.style.overflow = 'auto';
        localStorage.removeItem('nevys_popup_while_away');
      } else {
        // Show popup and continue timer
        this.idleTime.popupShownAt = popupData.popupShownAt;
        this.showIdlePopup = true;
        document.body.style.overflow = 'hidden';
        
        const remainingTime = this.idleTime.idleThreshold - timeSincePopup;
        this.idlePopupTimer = setTimeout(() => {
          console.log('⏰ 180 seconds total inactivity - sending analytics automatically');
          this.sendTrackingData('idle_timeout_180_seconds');
        }, remainingTime);
        
        console.log('💬 Restored popup that was shown while away, remaining time:', remainingTime);
        localStorage.removeItem('nevys_popup_while_away');
      }
      
    } catch (e) {
      console.warn('⚠️ Could not check popup while away data:', e);
      localStorage.removeItem('nevys_popup_while_away');
    }
  }

  private checkStoredTimeoutAndSendIfNeeded() {
    try {
      const stored = localStorage.getItem('nevys_idle_timeout');
      if (!stored) return;
      
      const timeoutData = JSON.parse(stored);
      
      // Only check if it's the same session
      if (timeoutData.sessionId !== this.sessionId) {
        localStorage.removeItem('nevys_idle_timeout');
        return;
      }
      
      const now = Date.now();
      const timeSincePopup = now - timeoutData.popupShownAt;
      
      console.log('🔍 AGGRESSIVE stored timeout check:', {
        timeSincePopup: timeSincePopup,
        threshold: this.idleTime.idleThreshold,
        shouldSend: timeSincePopup >= this.idleTime.idleThreshold,
        userAway: document.hidden
      });
      
      if (timeSincePopup >= this.idleTime.idleThreshold) {
        // 180 seconds total inactivity - send analytics immediately
        console.log('⏰ AGGRESSIVE stored timeout: 180 seconds total inactivity - sending analytics NOW');
        this.sendTrackingData('idle_timeout_180_seconds');
        localStorage.removeItem('nevys_idle_timeout');
      }
      
    } catch (e) {
      console.warn('⚠️ Could not check stored timeout data aggressively:', e);
      localStorage.removeItem('nevys_idle_timeout');
    }
  }

  private checkStoredIdleTimeoutData() {
    try {
      const stored = localStorage.getItem('nevys_idle_timeout');
      if (!stored) return;
      
      const timeoutData = JSON.parse(stored);
      
      // Only check if it's the same session
      if (timeoutData.sessionId !== this.sessionId) {
        localStorage.removeItem('nevys_idle_timeout');
        return;
      }
      
      const now = Date.now();
      const timeSincePopup = now - timeoutData.popupShownAt;
      
      console.log('🔍 Checking stored idle timeout data:', {
        timeSincePopup: timeSincePopup,
        threshold: this.idleTime.idleThreshold,
        shouldSend: timeSincePopup >= this.idleTime.idleThreshold
      });
      
      if (timeSincePopup >= this.idleTime.idleThreshold) {
        // 180 seconds total inactivity - send analytics immediately
        console.log('⏰ Stored timeout: 180 seconds total inactivity - sending analytics immediately');
        this.sendTrackingData('idle_timeout_180_seconds');
        localStorage.removeItem('nevys_idle_timeout');
      } else {
        // Restore the popup and continue tracking
        this.idleTime.popupShownAt = timeoutData.popupShownAt;
        this.showIdlePopup = true;
        document.body.style.overflow = 'hidden';
        
        const remainingTime = this.idleTime.idleThreshold - timeSincePopup;
        this.idlePopupTimer = setTimeout(() => {
          console.log('⏰ 180 seconds total inactivity - sending analytics automatically');
          this.sendTrackingData('idle_timeout_180_seconds');
        }, remainingTime);
        
        console.log('💬 Restored idle popup with remaining time:', remainingTime);
      }
      
    } catch (e) {
      console.warn('⚠️ Could not check stored idle timeout data:', e);
      localStorage.removeItem('nevys_idle_timeout');
    }
  }

  private async testZapierConnection() {
    try {
      console.log('🧪 Testing Zapier connection...');
      
      const testData = {
        selectedResponse: 'Test Connection',
        cancelReasons: ['Test'],
        marketingConsent: 'Test',
        englishImpact: 'Test',
        preferredStartTime: 'Test',
        paymentReadiness: 'Test',
        pricingResponse: 'Test',
        sessionId: 'test_' + Date.now(),
        trigger: 'connection_test',
        timestamp: new Date().toISOString(),
        totalSessionTime: 0,
        events: { test: true },
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        formStarted: false,
        formSubmitted: false,
        formInteractionTime: 0
      };
      
      const response = await this.zapierService.sendToZapier(testData);
      console.log('✅ Zapier connection test successful:', response);
      
    } catch (error) {
      console.error('❌ Zapier connection test failed:', error);
      console.log('🔧 Check your webhook URL and network connection');
    }
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
}
