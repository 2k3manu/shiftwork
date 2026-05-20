/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { 
  Briefcase, 
  Building2, 
  ChevronRight, 
  Star, 
  MapPin, 
  Clock, 
  Calendar, 
  ChefHat, 
  Truck, 
  User, 
  Home, 
  Menu, 
  Bell, 
  Search, 
  Filter, 
  CheckCircle2, 
  Plus, 
  ArrowLeft, 
  LogOut, 
  Edit2, 
  Camera, 
  Smartphone,
  Info,
  CreditCard,
  MessageCircle,
  Phone,
  Check,
  X,
  Languages
} from 'lucide-react';
import { Screen, UserRole, Job, Applicant } from './types';
import { DUMMY_JOBS, DUMMY_APPLICANTS } from './constants';

// --- Utility ---
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// --- Shared Components ---

const PhoneFrame = ({ children, hideNav = false, currentScreen, role, navigate }: { children: React.ReactNode, hideNav?: boolean, currentScreen: string, role: UserRole, navigate: (screen: Screen) => void }) => (
  <div className="min-h-screen bg-[#E5E9F0] flex items-center justify-center sm:py-8">
    <div className="phone-frame flex flex-col">
      {/* Status Bar */}
      <div className="status-bar group">
        <span className="font-bold">9:41</span>
        <div className="flex items-center gap-1.5 grayscale opacity-20 group-hover:opacity-100 transition-opacity">
          <div className="w-4 h-4 bg-black rounded-full text-[8px] flex items-center justify-center text-white">●</div>
          <div className="w-4 h-4 bg-black rounded-full"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {children}
      </div>

      {/* Bottom Nav */}
      {!hideNav && !['splash', 'role_selection', 'auth', 'worker_setup', 'tender_setup'].includes(currentScreen) && (
        <div className="h-20 bg-white border-t border-gray-100 flex items-center justify-around px-2 safe-area-bottom">
          <NavIcon 
            icon={<Home size={24} />} 
            label="Home" 
            active={currentScreen === (role === 'worker' ? 'worker_home' : 'tender_home')} 
            onClick={() => navigate(role === 'worker' ? 'worker_home' : 'tender_home')}
          />
          <NavIcon 
            icon={role === 'worker' ? <Briefcase size={24} /> : <Menu size={24} />} 
            label={role === 'worker' ? "My Jobs" : "Listings"} 
            active={currentScreen === 'my_jobs' || currentScreen === 'listings'} 
            onClick={() => navigate(role === 'worker' ? 'my_jobs' : 'tender_home')}
          />
          <NavIcon 
            icon={<MessageCircle size={24} />} 
            label={role === 'worker' ? "Co-Workers" : "Applicants"} 
            active={currentScreen === 'coworker_connect' || currentScreen === 'applicant_review'} 
            onClick={() => navigate(role === 'worker' ? 'coworker_connect' : 'applicant_review')}
          />
          <NavIcon 
            icon={<Star size={24} />} 
            label="Matches" 
            active={currentScreen === 'match_confirmed'} 
            onClick={() => navigate('match_confirmed')}
          />
          <NavIcon 
            icon={<User size={24} />} 
            label="Profile" 
            active={currentScreen === (role === 'worker' ? 'worker_profile' : 'tender_profile')} 
            onClick={() => navigate(role === 'worker' ? 'worker_profile' : 'tender_profile')}
          />
        </div>
      )}
    </div>
  </div>
);

const NavIcon = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 min-w-[64px]">
    <div className={cn("transition-colors", active ? "text-accent" : "text-gray-400")}>
      {icon}
    </div>
    <span className={cn("text-[10px] font-medium", active ? "text-accent" : "text-gray-400")}>{label}</span>
  </button>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  className,
  disabled = false
}: { 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost',
  onClick?: () => void,
  className?: string,
  disabled?: boolean
}) => {
  const variants = {
    primary: 'bg-accent text-white shadow-lg shadow-orange-200',
    secondary: 'bg-primary text-white shadow-lg shadow-blue-200',
    outline: 'border-2 border-primary text-primary',
    danger: 'bg-error text-white shadow-lg shadow-red-200',
    ghost: 'text-primary'
  };
  
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full py-4 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
};

const ProfileStat = ({ label, value }: { label: string, value: string }) => (
  <div className="bg-bg-light p-3 rounded-2xl flex flex-col items-center">
    <span className="text-[10px] font-bold text-text-secondary uppercase mb-1">{label}</span>
    <span className="text-lg font-bold text-primary">{value}</span>
  </div>
);

const ReviewItem = ({ name, rating, text, date }: { name: string, rating: number, text: string, date: string }) => (
  <div className="p-4 bg-white rounded-xl shadow-sm space-y-2">
    <div className="flex justify-between items-start">
      <h4 className="font-bold text-sm">{name}</h4>
      <span className="text-[10px] text-gray-400">{date}</span>
    </div>
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} className={cn(i <= rating ? "text-yellow-400 fill-current" : "text-gray-200")} />)}
    </div>
    <p className="text-xs text-text-secondary">{text}</p>
  </div>
);

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [role, setRole] = useState<UserRole>(null);
  const [workerAvailability, setWorkerAvailability] = useState<Record<string, {active: boolean, start: string, end: string}>>(() => {
    const initial: Record<string, {active: boolean, start: string, end: string}> = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        initial[dateStr] = { active: false, start: '09:00', end: '18:00' };
    }
    return initial;
  });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>(DUMMY_JOBS);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [workerName, setWorkerName] = useState('');
  const [workerAge, setWorkerAge] = useState('');
  const [workerGender, setWorkerGender] = useState('Male');
  const [workerSkills, setWorkerSkills] = useState<string[]>([]);
  const [workerFood, setWorkerFood] = useState('');
  const [workerUpi, setWorkerUpi] = useState('');

  const isAvailableToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return workerAvailability[today]?.active ?? false;
  }, [workerAvailability]);

  const hasAnyAvailability = useMemo(() => {
    return Object.values(workerAvailability).some(day => day.active);
  }, [workerAvailability]);

  const [tenderName, setTenderName] = useState('');
  const [tenderGst, setTenderGst] = useState('');
  const [tenderServices, setTenderServices] = useState<string[]>([]);
  const [tenderLocation, setTenderLocation] = useState('Indiranagar');
  const [tenderSize, setTenderSize] = useState('2-10 Workers');

  const [homeSearch, setHomeSearch] = useState('');
  const [homeFilter, setHomeFilter] = useState('All Gigs');
  const [homeSortBy, setHomeSortBy] = useState('Recommended');
  const [homeDateFilter, setHomeDateFilter] = useState<string | null>(null);

  // Auto-transition from splash
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => setCurrentScreen('role_selection'), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  // --- Screens ---

  const SplashScreen = () => (
    <div className="h-full bg-gradient-to-br from-primary to-primary-light flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
          <Briefcase size={48} className="text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">ShiftWork</h1>
        <p className="text-blue-100 font-medium">Your next gig is one tap away</p>
      </motion.div>
      
      {/* Decorative background circles */}
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
    </div>
  );

  const RoleSelection = () => (
    <div className="h-full p-8 flex flex-col bg-bg-light overflow-y-auto no-scrollbar pb-24">
      <div className="mt-12 mb-10">
        <h2 className="text-3xl font-bold mb-3">How do you want to use ShiftWork?</h2>
        <p className="text-text-secondary">Select your path to get started</p>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <RoleCard 
          icon={<User size={32} />} 
          title="I want to Work" 
          subtitle="Find gigs, earn money, build your profile"
          onClick={() => { setRole('worker'); navigate('auth'); }}
        />
        <RoleCard 
          icon={<Building2 size={32} />} 
          title="I'm a Tender" 
          subtitle="Post jobs, find reliable workers fast"
          onClick={() => { setRole('tender'); navigate('auth'); }}
        />
      </div>
    </div>
  );

  const RoleCard = ({ icon, title, subtitle, onClick }: { icon: React.ReactNode, title: string, subtitle: string, onClick: () => void }) => (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="p-6 bg-white rounded-[24px] border border-gray-100 hover:border-accent shadow-sm text-left transition-all"
    >
      <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-1">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{subtitle}</p>
    </motion.button>
  );

  const AuthScreen = () => {
    const [tab, setTab] = useState<'signup' | 'login'>('signup');
    const [phone, setPhone] = useState('');
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '']);

    useEffect(() => {
      if (phone.length === 10 && !showOtp) {
        setShowOtp(true);
      }
    }, [phone, showOtp]);

    const handleSendOtp = () => {
      if (/^\d{10}$/.test(phone)) {
        setShowOtp(true);
      }
    };

    const handleVerifyOtp = () => {
      if (otp.join('').length === 4) {
        if (tab === 'login') {
          // If login, immediately go to home
          navigate(role === 'worker' ? 'worker_home' : 'tender_home');
        } else {
          // If signup, go to setup
          navigate(role === 'worker' ? 'worker_setup' : 'tender_setup');
        }
      }
    };

    const handleOtpChange = (index: number, value: string) => {
      if (value.length <= 1 && /^\d*$/.test(value)) {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        // Auto focus next logic could be added here, but keeping it simple
        if (value && index < 3) {
          const nextInput = document.getElementById(`otp-${index + 1}`);
          if (nextInput) nextInput.focus();
        }
      }
    };

    return (
      <div className="h-full p-8 flex flex-col bg-white overflow-y-auto no-scrollbar pb-24">
        <button onClick={() => navigate('role_selection')} className="mb-8 mt-4">
          <ArrowLeft size={24} />
        </button>

        <div className="flex bg-gray-100 p-1 rounded-lg mb-10">
          <button 
            className={cn("flex-1 py-2.5 rounded-md text-sm font-bold transition-all", tab === 'signup' ? "bg-white shadow-sm text-primary" : "text-gray-400")}
            onClick={() => setTab('signup')}
          >
            Sign Up
          </button>
          <button 
            className={cn("flex-1 py-2.5 rounded-md text-sm font-bold transition-all", tab === 'login' ? "bg-white shadow-sm text-primary" : "text-gray-400")}
            onClick={() => setTab('login')}
          >
            Log In
          </button>
        </div>

        <h2 className="text-2xl font-bold mb-2">Hello {role === 'worker' ? 'Student' : 'Tender'}!</h2>
        <p className="text-text-secondary mb-8">Enter your phone number to {tab === 'signup' ? 'create an account' : 'log in'}</p>

        <div className="space-y-6 flex-1">
          {!showOtp ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Phone Number</label>
                <div className="flex gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 flex items-center font-bold">+91</div>
                  <input 
                    type="tel" 
                    value={phone}
                    maxLength={10}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="0000000000" 
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:border-accent" 
                  />
                </div>
              </div>

              <Button onClick={handleSendOtp} disabled={phone.length !== 10}>
                Send OTP
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500 font-medium">Or continue with</span></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" /> Google
                </button>
                <button className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50">
                  <img src="https://www.apple.com/favicon.ico" className="w-4 h-4" alt="Apple" /> Apple
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 mb-8">
                <label className="text-sm font-bold text-gray-700">Enter 4-digit OTP</label>
                <div className="flex gap-4 justify-between">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="tel"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-xl text-center text-xl font-bold outline-none focus:border-accent"
                      maxLength={1}
                    />
                  ))}
                </div>
              </div>

              <Button onClick={handleVerifyOtp} disabled={otp.join('').length !== 4}>
                Verify & Continue
              </Button>
              <button 
                onClick={() => setShowOtp(false)}
                className="w-full mt-4 text-sm font-bold text-gray-500 hover:text-accent transition-colors"
              >
                Change Phone Number
              </button>
            </>
          )}
        </div>

        <p className="text-[10px] text-center text-gray-400 mt-8 mb-4">
          By continuing, you agree to ShiftWork's <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>
        </p>
      </div>
    );
  };

  const WorkerSetup = () => {
    const isEditing = !!workerName;
    const [step, setStep] = useState(1);
    const [selectedSkills, setSelectedSkills] = useState<string[]>(workerSkills);
    const [foodComfort, setFoodComfort] = useState<string>(workerFood);
    const [upiIdInput, setUpiIdInput] = useState(workerUpi);
    const [localNameInput, setLocalNameInput] = useState(workerName);
    const [localAgeInput, setLocalAgeInput] = useState(workerAge);
    const [localGenderInput, setLocalGenderInput] = useState(workerGender);
    
    const toggleSkill = (skill: string) => {
      setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
    };
    
    const showStep1 = isEditing || step === 1;
    const showStep2 = isEditing || step === 2;
    const showStep3 = isEditing || step === 3;

    const handleSave = () => {
      setWorkerName(localNameInput.trim());
      setWorkerAge(localAgeInput.trim());
      setWorkerGender(localGenderInput);
      setWorkerSkills(selectedSkills);
      setWorkerFood(foodComfort);
      setWorkerUpi(upiIdInput.trim());
      navigate(isEditing ? 'worker_profile' : 'worker_home');
    };

    return (
      <div className="h-full p-8 flex flex-col bg-bg-light overflow-y-auto no-scrollbar pb-24">
        <div className="flex items-center justify-between mb-8 mt-4">
          <button onClick={() => {
            if (!isEditing && step > 1) setStep(step - 1);
            else navigate(isEditing ? 'worker_profile' : 'auth');
          }}>
            <ArrowLeft size={24} />
          </button>
          <div className="flex gap-1.5">
            {!isEditing ? [1, 2, 3].map(i => (
              <div key={i} className={cn("w-6 h-1.5 rounded-full", i <= step ? "bg-accent" : "bg-gray-300")} />
            )) : <span className="text-sm font-bold text-gray-500">Edit Profile</span>}
          </div>
        </div>

        {showStep1 && (
          <div className={cn("space-y-6", isEditing && "mb-8")}>
            {(!isEditing) && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Personal Info</h2>
                <p className="text-text-secondary">Help tenders get to know you</p>
              </div>
            )}
            
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center relative mb-2 overflow-hidden">
                <User size={40} className="text-gray-400" />
                <button className="absolute bottom-0 right-0 p-2 bg-accent text-white rounded-full shadow-lg">
                  <Camera size={16} />
                </button>
              </div>
              <span className="text-xs font-bold text-accent">Upload Photo</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Full Name</label>
                <input type="text" value={localNameInput} onChange={(e) => setLocalNameInput(e.target.value)} className="w-full bg-white rounded-lg p-3 border border-gray-200 focus:border-accent outline-none" placeholder="Your Name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Age</label>
                  <input type="number" value={localAgeInput} onChange={(e) => setLocalAgeInput(e.target.value)} className="w-full bg-white rounded-lg p-3 border border-gray-200 outline-none" placeholder="20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Gender</label>
                  <select value={localGenderInput} onChange={(e) => setLocalGenderInput(e.target.value)} className="w-full bg-white rounded-lg p-3 border border-gray-200 outline-none">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>
            {!isEditing && (
              <Button disabled={!localNameInput.trim() || !localAgeInput.trim()} onClick={() => {
                setWorkerName(localNameInput.trim());
                setWorkerAge(localAgeInput.trim());
                setWorkerGender(localGenderInput);
                setStep(2);
              }}>Continue</Button>
            )}
          </div>
        )}

        {showStep2 && (
          <div className={cn("space-y-6", isEditing && "mb-8")}>
            {(!isEditing) && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Skills & Preferences</h2>
                <p className="text-text-secondary">What kind of work do you enjoy?</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">Select your Skills</label>
                <div className="flex flex-wrap gap-2">
                  {['Bokeh Serving', 'Manual Serving', 'Catering Helper', 'Packing', 'Moving', 'Cleanup'].map(skill => (
                    <button 
                      key={skill} 
                      onClick={() => toggleSkill(skill)}
                      className={cn(
                        "px-4 py-2 border rounded-full text-xs font-bold transition-colors",
                        selectedSkills.includes(skill) ? "bg-accent text-white border-accent" : "border-gray-200 bg-white hover:border-accent text-text-primary"
                      )}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">Food Comfort</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Veg Only', 'Non-Veg', 'Both'].map(type => (
                    <button 
                      key={type} 
                      onClick={() => setFoodComfort(type)}
                      className={cn(
                        "p-3 border rounded-lg text-xs font-bold text-center transition-all",
                        foodComfort === type ? "bg-accent text-white border-accent" : "border-gray-200 bg-white"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {!isEditing && (
              <Button disabled={selectedSkills.length === 0 || !foodComfort} onClick={() => {
                setWorkerSkills(selectedSkills);
                setWorkerFood(foodComfort);
                setStep(3);
              }}>Almost Done</Button>
            )}
          </div>
        )}

        {showStep3 && (
          <div className="space-y-6">
            {(!isEditing) && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Availability & Payment</h2>
                <p className="text-text-secondary">Last step to start earning!</p>
              </div>
            )}

            <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold">When can you work?</h4>
                  <p className="text-xs text-text-secondary">Tap a day to mark yourself available. You can always change this later.</p>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(workerAvailability).map(([day, auth]: [string, any]) => {
                  const dateObj = new Date(day);
                  return (
                  <div key={day} className="flex items-center gap-2">
                     <button 
                       onClick={() => setWorkerAvailability(prev => ({...prev, [day]: {...prev[day], active: !prev[day].active}}))}
                       className={cn("w-16 py-1.5 rounded-lg text-[10px] font-bold transition-colors", auth.active ? "bg-accent text-white" : "bg-gray-100 text-gray-400")}
                     >
                       {dateObj.toLocaleDateString('en-US', { weekday: 'short' })} {dateObj.getDate()}
                     </button>
                     {auth.active ? (
                       <div className="flex flex-1 items-center gap-2">
                         <input 
                           type="time" 
                           value={auth.start}
                           onChange={(e) => setWorkerAvailability(prev => ({...prev, [day]: {...prev[day], start: e.target.value}}))}
                           className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-xs outline-none" 
                         />
                         <span className="text-gray-400 text-xs">-</span>
                         <input 
                           type="time" 
                           value={auth.end}
                           onChange={(e) => setWorkerAvailability(prev => ({...prev, [day]: {...prev[day], end: e.target.value}}))}
                           className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-xs outline-none" 
                         />
                       </div>
                     ) : (
                       <div className="flex-1 text-xs text-gray-400 ml-2 font-medium">Unavailable</div>
                     )}
                  </div>
                ); })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">UPI ID</label>
                <input type="text" value={upiIdInput} onChange={(e) => setUpiIdInput(e.target.value)} className="w-full bg-white rounded-lg p-3 border border-gray-200 outline-none" placeholder="rahul@okicici" />
              </div>
            </div>
            
            {!isEditing ? (
              <Button disabled={!upiIdInput.trim()} onClick={handleSave}>Complete Setup</Button>
            ) : (
              <div className="pt-6">
                <Button disabled={!localNameInput.trim() || !localAgeInput.trim() || !upiIdInput.trim()} onClick={handleSave}>Save Changes</Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const WorkerHome = () => {
    let displayedJobs = jobs.filter(job => {
      const matchesSearch = job.subType.toLowerCase().includes(homeSearch.toLowerCase()) || 
                            job.tenderName.toLowerCase().includes(homeSearch.toLowerCase()) || 
                            job.location.toLowerCase().includes(homeSearch.toLowerCase()) || 
                            job.type.toLowerCase().includes(homeSearch.toLowerCase());
      
      const p = parseInt(job.pay.replace(/[^0-9]/g, ''));
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      const tomorrowFormatted = `${tmrw.toLocaleDateString('en-US', { weekday: 'short' })}, ${tmrw.getDate()} ${tmrw.toLocaleDateString('en-US', { month: 'short' })}`;

      const matchesFilter = homeFilter === 'All Gigs' ? true :
                            homeFilter === 'Catering' ? job.type === 'Catering' :
                            homeFilter === 'Shifting' ? job.type === 'Home Shifting' :
                            homeFilter === 'Tomorrow' ? job.date.includes(tomorrowFormatted) : 
                            homeFilter === 'Pay > ₹1000' ? p > 1000 : true;

      let matchesDate = true;
      if (homeDateFilter) {
          const filterDate = new Date(homeDateFilter);
          const filterDateFormatted = `${filterDate.toLocaleDateString('en-US', { weekday: 'short' })}, ${filterDate.getDate()} ${filterDate.toLocaleDateString('en-US', { month: 'short' })}`.toLowerCase();
          matchesDate = job.date.toLowerCase() === filterDateFormatted;
      }

      return matchesSearch && matchesFilter && matchesDate;
    });

    displayedJobs.sort((a, b) => {
       if (homeSortBy === 'Distance') {
          return parseFloat(a.distance) - parseFloat(b.distance);
       } else if (homeSortBy === 'Pay') {
          const am = parseInt(a.pay.replace(/[^0-9]/g, ''));
          const bm = parseInt(b.pay.replace(/[^0-9]/g, ''));
          return bm - am;
       } else if (homeSortBy === 'Rating') {
          return (b.tenderRating || 0) - (a.tenderRating || 0);
       }
       return 0; // target 'Recommended' which is the default order
    });

    return (
      <div className="h-full bg-bg-light overflow-y-auto no-scrollbar pb-24">
        <div className="p-6 bg-white space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full overflow-hidden">
                <User className="text-white m-2" />
              </div>
              <div>
                <h2 className="font-bold">{workerName ? `Hey ${workerName.split(' ')[0]}!` : 'Hey!'} 👋</h2>
                <div 
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => navigate('worker_profile')}
                >
                  <div className={cn("w-2 h-2 rounded-full", isAvailableToday ? "bg-success" : "bg-gray-400")} />
                  <span className="text-[10px] text-text-secondary">{isAvailableToday ? 'Available today \u00B7 9:00 AM\u20136:00 PM' : 'Not available today'}</span>
                  <span className="text-[10px] text-accent ml-1 underline">Set Availability</span>
                </div>
              </div>
            </div>
            <div className="relative cursor-pointer" onClick={() => setShowNotifications(true)}>
              <Bell className="text-gray-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent border-2 border-white rounded-full" />
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Find gigs in Bengaluru" 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 pl-10 pr-4 outline-none focus:border-accent"
              value={homeSearch}
              onChange={(e) => setHomeSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {Array.from({length: 7}).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const dateStr = d.toISOString().split('T')[0];
              const isSelected = homeDateFilter === dateStr;
              
              const formattedJobDateStr = `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`.toLowerCase();
              const hasGigs = jobs.some(j => j.date.toLowerCase() === formattedJobDateStr);

              return (
                <button 
                  key={dateStr} 
                  onClick={() => setHomeDateFilter(isSelected ? null : dateStr)}
                  className={cn("flex flex-col items-center justify-center p-2 rounded-xl min-w-[50px] border transition-colors", 
                    isSelected ? "bg-accent/10 border-accent/30" : "bg-gray-50 border-gray-100 hover:border-gray-200"
                  )}
                >
                  <span className={cn("text-[9px] font-bold", isSelected ? "text-accent" : "text-gray-400")}>{d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</span>
                  <span className={cn("text-xs font-bold my-0.5", isSelected ? "text-accent" : "text-gray-600")}>{d.getDate()}</span>
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1", hasGigs ? "bg-accent" : "bg-gray-200")} />
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['All Gigs', 'Catering', 'Shifting', 'Tomorrow', 'Pay > ₹1000'].map((f) => (
              <button 
                key={f} 
                onClick={() => setHomeFilter(f)}
                className={cn("px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors", homeFilter === f ? "bg-accent text-white" : "bg-white border text-text-secondary shadow-sm hover:border-accent")}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">Gigs Near You</h3>
            <select 
               value={homeSortBy} 
               onChange={(e) => setHomeSortBy(e.target.value)}
               className="bg-transparent text-xs font-bold text-accent outline-none ml-2"
            >
               <option value="Recommended">Recommended</option>
               <option value="Distance">Nearest</option>
               <option value="Pay">Highest Pay</option>
               <option value="Rating">Top Rated</option>
            </select>
          </div>
          
          {displayedJobs.length > 0 ? displayedJobs.map(job => (
            <JobCard key={job.id} job={job} onClick={() => { setSelectedJob(job); navigate('job_detail'); }} />
          )) : (
            <div className="text-center text-text-secondary py-10 font-bold text-sm">No gigs match your criteria</div>
          )}
        </div>
      </div>
    );
  };

  const JobCard: React.FC<{ job: Job, onClick: () => void }> = ({ job, onClick }) => (
    <motion.div 
      key={job.id}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative",
        job.status === 'full' && "opacity-75"
      )}
    >
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold text-white",
              job.type === 'Catering' ? "bg-accent" : "bg-primary"
            )}>
              {job.subType}
            </span>
            <div className="flex items-center text-xs font-bold text-gray-500">
              <Star size={12} className="text-yellow-400 fill-current mr-1" />
              {job.tenderRating}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">{job.pay}</div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider">{job.payType === 'hourly' ? '/ Hour' : 'Fixed'}</div>
          </div>
        </div>

        <h4 className="font-bold flex items-center gap-1">
          {job.tenderName} {job.isVerified && <CheckCircle2 size={12} className="text-blue-500" />}
        </h4>

        <div className="grid grid-cols-2 gap-y-2 text-[11px] text-text-secondary font-medium">
          <div className="flex items-center gap-1.5"><Calendar size={12} /> {job.date}</div>
          <div className="flex items-center gap-1.5"><Clock size={12} /> {job.time}</div>
          <div className="flex items-center gap-1.5"><MapPin size={12} /> {job.location} ({job.distance})</div>
          <div className="flex items-center gap-1.5"><ChefHat size={12} /> {job.foodType} event</div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="" />
                </div>
              ))}
            </div>
            <span className="text-[10px] text-text-secondary font-bold">{job.spotsTotal - job.spotsFilled} spots left</span>
          </div>
          <button className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all",
            job.status === 'applied' ? "bg-success/10 text-success" : 
            job.status === 'full' ? "bg-gray-100 text-gray-400" : "bg-accent text-white"
          )}>
            {job.status === 'applied' ? 'Applied' : job.status === 'full' ? 'Full' : 'Apply Now'}
          </button>
        </div>

        <div className="mt-2 py-2 border-t border-gray-50 flex items-center gap-2 text-[10px] text-primary font-bold">
          <div className="p-1 bg-primary/5 rounded">🚇</div>
          <span>{job.transport.split('|')[0]}</span>
        </div>
      </div>
    </motion.div>
  );

  const JobDetail = () => {
    if (!selectedJob) return null;
    return (
      <div className="h-full bg-white flex flex-col">
        <div className="p-6 pb-0 relative">
          <button onClick={() => navigate('worker_home')} className="mb-6 w-10 h-10 bg-white rounded-full border border-gray-100 flex items-center justify-center shadow-sm">
            <ArrowLeft size={20} />
          </button>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                {selectedJob.type === 'Catering' ? <ChefHat className="text-primary" /> : <Truck className="text-primary" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{selectedJob.tenderName}</h2>
                  <div className="flex items-center text-xs font-bold text-gray-500">
                    <Star size={14} className="text-yellow-400 fill-current mr-1" />
                    {selectedJob.tenderRating}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">127 jobs posted</span>
                  {selectedJob.isVerified && <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Verified ✅</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-bg-light rounded-xl space-y-1">
                <span className="text-[10px] uppercase text-text-secondary font-bold">Work Type</span>
                <p className="text-sm font-bold">{selectedJob.subType}</p>
              </div>
              <div className="p-3 bg-bg-light rounded-xl space-y-1">
                <span className="text-[10px] uppercase text-text-secondary font-bold">Duration</span>
                <p className="text-sm font-bold">5 hours</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex-1 space-y-8 mt-4 overflow-y-auto no-scrollbar">
          <section className="space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <Info size={16} className="text-primary" /> Job Details
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <DetailItem icon={<Calendar size={14} />} text={`${selectedJob.date} · 6:00 PM – 11:00 PM`} />
              <DetailItem icon={<MapPin size={14} />} text={`${selectedJob.location}, Bengaluru`} />
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs flex items-start gap-2">
                <Truck size={14} className="text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-blue-800">Transport Suggestion</p>
                  <p className="text-blue-700">{selectedJob.transport}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-bold">Terms & Conditions</h3>
            <div className="space-y-2">
              <TermItem text={`Pay: ${selectedJob.pay} (${selectedJob.payType})`} checked />
              <TermItem text={`Travel: ${selectedJob.travel} reimbursement`} checked />
              <TermItem text={`Food: ${selectedJob.food}`} checked />
              <TermItem text={`Event: ${selectedJob.foodType} catering`} checked />
              <TermItem text={`Payment: After job completion`} checked />
            </div>
          </section>

          <section className="p-4 bg-primary text-white rounded-xl space-y-2">
            <h4 className="font-bold text-sm">Special Instructions</h4>
            <p className="text-xs text-blue-100 leading-relaxed">
              Wear black formal attire. Report 30 minutes before start time. Contact Tender on arrival. Do not use phone during service hours.
            </p>
          </section>
        </div>

        <div className="p-6 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
           <Button onClick={() => {
             const updatedJobs = jobs.map(j => j.id === selectedJob.id ? {...j, status: 'applied'} as Job : j);
             setJobs(updatedJobs);
             navigate('worker_home');
           }}>
             {selectedJob.status === 'applied' ? 'Withdraw Application' : 'Apply for this Slot'}
           </Button>
        </div>
      </div>
    );
  };

  const DetailItem = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
    <div className="flex items-center gap-3 text-sm font-medium text-text-primary">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
        {icon}
      </div>
      {text}
    </div>
  );

  const TermItem = ({ text, checked }: { text: string, checked?: boolean }) => (
    <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", checked ? "bg-success text-white" : "bg-gray-100 text-gray-300")}>
        <Check size={12} />
      </div>
      <span className="text-sm font-bold text-text-primary">{text}</span>
    </div>
  );

  const WorkerProfile = () => (
    <div className="h-full bg-bg-light overflow-y-auto no-scrollbar pb-24">
      <div className="bg-white p-6 pt-12 rounded-b-[40px] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-8">
          <button 
             onClick={() => navigate(role === 'worker' ? 'worker_setup' : 'tender_setup')}
             className="px-3 py-1.5 bg-gray-100 rounded-full text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors"
          >
             Edit Profile
          </button>
          <button onClick={() => navigate('role_selection')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
            <LogOut size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-primary rounded-full mb-4 ring-4 ring-blue-50 overflow-hidden flex items-center justify-center">
            {role === 'worker' ? (
               <User size={40} className="text-white" />
            ) : (
               <Building2 size={40} className="text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold flex items-center gap-1.5">
            {role === 'worker' ? workerName : tenderName} <CheckCircle2 size={16} className="text-blue-500" />
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-xs font-bold">
              <Star size={12} className="text-yellow-400 fill-current" /> 4.8
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-xs font-bold text-text-secondary">23 jobs completed</span>
          </div>

          <div className="grid grid-cols-3 w-full gap-4 mt-8">
            <ProfileStat label="Jobs" value="23" />
            <ProfileStat label="Earnings" value="₹18k" />
            <ProfileStat label="Rating" value="4.8" />
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6 pb-20">
        <div className="p-4 bg-white rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">My Availability</h3>
            <Edit2 size={16} className="text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {Object.entries(workerAvailability).map(([day, auth]: [string, any]) => {
              const dateObj = new Date(day);
              // Using a simple toggle for active, but if active, expanding inline times
              return (
                <div key={day} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className={cn("w-10 h-10 rounded-full flex flex-col items-center justify-center shadow-sm border", auth.active ? "bg-accent/10 border-accent/20 text-accent" : "bg-white border-gray-200 text-gray-400")}>
                         <span className="text-[10px] font-bold uppercase">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                         <span className="text-xs font-bold leading-none">{dateObj.getDate()}</span>
                       </div>
                       <div>
                         <p className={cn("text-sm font-bold", auth.active ? "text-gray-800" : "text-gray-400")}>
                           {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                         </p>
                         <p className="text-[10px] text-gray-500">{dateObj.getDate()} {dateObj.toLocaleDateString('en-US', { month: 'short' })}</p>
                       </div>
                    </div>
                    
                    <button
                      onClick={() => setWorkerAvailability(prev => ({...prev, [day]: {...prev[day], active: !prev[day].active}}))}
                      className={cn("relative flex items-center w-14 h-7 rounded-full transition-colors shadow-inner focus:outline-none", auth.active ? "bg-success" : "bg-gray-300")}
                    >
                      <span className={cn("absolute left-[6px] text-[9px] font-bold text-white transition-opacity", auth.active ? "opacity-100" : "opacity-0")}>ON</span>
                      <span className={cn("absolute right-[5px] text-[9px] font-bold text-gray-600 transition-opacity", auth.active ? "opacity-0" : "opacity-100")}>OFF</span>
                      <div className={cn("absolute left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform", auth.active ? "translate-x-7" : "translate-x-0")} />
                    </button>
                  </div>

                  {auth.active && (
                    <div className="flex items-center gap-2 mt-2 ml-[52px]">
                      <input 
                        type="time" 
                        value={auth.start}
                        onChange={(e) => setWorkerAvailability(prev => ({...prev, [day]: {...prev[day], start: e.target.value}}))}
                        className="w-24 bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-700 outline-none focus:border-accent shadow-sm" 
                      />
                      <span className="text-gray-400 text-xs">-</span>
                      <input 
                        type="time" 
                        value={auth.end}
                        onChange={(e) => setWorkerAvailability(prev => ({...prev, [day]: {...prev[day], end: e.target.value}}))}
                        className="w-24 bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-700 outline-none focus:border-accent shadow-sm" 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold px-1">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {['Bokeh Serving', 'Manual Serving', 'Cleanup'].map(s => (
              <span key={s} className="px-4 py-2 bg-white rounded-full text-xs font-bold border border-gray-100 shadow-sm">{s}</span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
            <h3 className="font-bold px-1">Recent Reviews</h3>
            <ReviewItem name="Sai Caterers" rating={5} text="Rahul was excellent! Punctual and professional." date="2 days ago" />
            <ReviewItem name="Annapurna Events" rating={4} text="Good work, could improve communication." date="1 week ago" />
        </div>
      </div>
    </div>
  );

  const SettingsIcon = () => (
    <button onClick={() => navigate('role_selection')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
      <LogOut size={18} />
    </button>
  );

  const TenderHome = () => {
    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'drafts'>('active');
    return (
      <div className="h-full bg-bg-light overflow-y-auto no-scrollbar pb-24">
        <div className="p-6 bg-white space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full overflow-hidden">
                <Building2 className="text-white m-2.5" size={20} />
              </div>
              <div>
                <h2 className="font-bold">{tenderName ? `${tenderName} 👋` : 'Hey! 👋'}</h2>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-[10px] text-text-secondary">Verified Business</span>
                </div>
              </div>
            </div>
            <div className="relative cursor-pointer" onClick={() => setShowNotifications(true)}>
              <Bell className="text-gray-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent border-2 border-white rounded-full" />
            </div>
          </div>

          <Button variant="primary" className="flex items-center justify-center gap-2" onClick={() => navigate('job_posting')}>
            <Plus size={20} /> Post a New Job Slot
          </Button>

          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['active', 'completed', 'drafts'].map((t) => (
              <button 
                key={t}
                className={cn("flex-1 py-2 rounded-md text-xs font-bold capitalize transition-all", activeTab === t ? "bg-white shadow-sm text-primary" : "text-gray-400")}
                onClick={() => setActiveTab(t as any)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {activeTab === 'active' && (
            <>
              <TenderJobCard 
                type="Bokeh Serving" 
                date="Sun, 11 May" 
                time="6-11 PM" 
                location="Indiranagar" 
                applicants={12} 
                filled={2} 
                total={4} 
                status="active"
                onClick={() => navigate('applicant_review')}
              />
              <TenderJobCard 
                type="Manual Serving" 
                date="Sat, 17 May" 
                time="11 AM-4 PM" 
                location="JP Nagar" 
                applicants={3} 
                filled={0} 
                total={6} 
                status="pending"
                onClick={() => {}}
              />
            </>
          )}
          {activeTab === 'completed' && <div className="text-center py-10 text-gray-400 text-sm">No completed jobs yet</div>}
        </div>
      </div>
    );
  };

  const TenderJobCard = ({ type, date, time, location, applicants, filled, total, status, onClick }: any) => (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onClick} className="bg-white p-4 rounded-3xl shadow-sm space-y-4 border border-gray-100">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">{type}</span>
          <h4 className="font-bold flex items-center gap-1.5"><Calendar size={12} /> {date}</h4>
          <p className="text-[10px] text-text-secondary flex items-center gap-1"><Clock size={12} /> {time} · <MapPin size={12} /> {location}</p>
        </div>
        <div className={cn("px-2 py-1 rounded-md text-[10px] font-bold", status === 'active' ? "bg-success/10 text-success" : "bg-warning/10 text-orange-500")}>
          {status === 'active' ? '🟢 Active' : '🟡 Pending'}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="bg-bg-light px-3 py-1.5 rounded-xl flex items-center gap-2">
          <User size={14} className="text-primary" />
          <span className="text-xs font-bold text-primary">{applicants} Applicants</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-secondary font-bold mb-1">{filled}/{total} slots filled</p>
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${(filled/total)*100}%` }} />
          </div>
        </div>
      </div>
    </motion.div>
  );

  const JobPostingFlow = () => {
    const [step, setStep] = useState(1);
    return (
      <div className="h-full bg-white flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep(step - 1) : navigate('tender_home')}>
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-bold">Post a New Job</h2>
          <div className="w-6" />
        </div>

        <div className="p-8 flex-1 space-y-8 overflow-y-auto">
          <div className="flex justify-between relative px-4">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 -z-0" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all", i <= step ? "bg-accent text-white" : "bg-white border-2 border-gray-100 text-gray-300")}>
                {i}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Job Basics</h3>
              <div className="grid grid-cols-2 gap-4">
                <OptionCard icon={<ChefHat />} label="Catering" selected />
                <OptionCard icon={<Truck />} label="Shifting" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">Workers Needed</label>
                <div className="flex items-center gap-6 bg-bg-light p-2 rounded-xl w-fit">
                  <button className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center font-bold text-xl">-</button>
                  <span className="text-xl font-bold">4</span>
                  <button className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center font-bold text-xl">+</button>
                </div>
              </div>
              <Button onClick={() => setStep(2)}>Next Step</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Location & Logistics</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Area in Bengaluru</label>
                  <select className="w-full bg-bg-light p-4 rounded-xl border-none outline-none font-bold">
                    <option>Indiranagar</option>
                    <option>Koramangala</option>
                    <option>HSR Layout</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 bg-bg-light rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center"><ChefHat className="text-accent" /></div>
                    <div><h4 className="font-bold text-sm">Food Provided</h4><p className="text-[10px] text-gray-500">Meal for workers</p></div>
                  </div>
                  <Toggle active={true} />
                </div>
              </div>
              <Button onClick={() => setStep(3)}>Next Step</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Pay & Terms</h3>
              <div className="bg-bg-light p-4 rounded-xl space-y-4">
                <div className="flex bg-white p-1 rounded-lg">
                  <button className="flex-1 py-2 bg-accent text-white rounded-md text-xs font-bold">Per Hour</button>
                  <button className="flex-1 py-2 text-gray-400 text-xs font-bold">Fixed Pay</button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Hourly Rate (₹)</label>
                  <input type="number" className="w-full bg-white p-4 rounded-lg outline-none font-display text-2xl font-bold" placeholder="180" />
                  <p className="text-[10px] text-accent font-bold">Suggested range: ₹150 - ₹250/hr</p>
                </div>
              </div>
              <Button onClick={() => setStep(4)}>Review Listing</Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Ready to Post?</h3>
              <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-bg-light space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg">Bokeh Serving</h4>
                    <p className="text-sm text-text-secondary">Sai Caterers · Indiranagar</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-accent">₹180/hr</p>
                    <p className="text-[10px] text-gray-400">4 WORKERS</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-gray-600">
                  <div className="flex items-center gap-1"><Calendar size={14}/> 11 May</div>
                  <div className="flex items-center gap-1"><Clock size={14}/> 6-11 PM</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent" />
                <span className="text-xs text-gray-500 font-medium">I agree to ShiftWork's platform terms</span>
              </div>
              <Button onClick={() => { navigate('tender_home'); }}>Post Job Slot</Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ApplicantReview = () => {
    const [selected, setSelected] = useState<string[]>([]);
    const toggleSelect = (id: string) => {
      setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
      <div className="h-full bg-bg-light flex flex-col">
        <div className="p-6 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('tender_home')}><ArrowLeft size={24} /></button>
            <h2 className="font-bold text-lg">Applicants</h2>
          </div>
          <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500">12 TOTAL</span>
        </div>

        <div className="p-6 flex-1 space-y-4 overflow-y-auto no-scrollbar">
          {DUMMY_APPLICANTS.map(app => (
            <div key={app.id} className={cn("p-4 bg-white rounded-3xl shadow-sm border-2 transition-all", selected.includes(app.id) ? "border-accent" : "border-transparent")}>
              <div className="flex gap-4">
                <img src={app.photo} className="w-14 h-14 rounded-2xl object-cover" alt="" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold flex items-center gap-1 text-sm">{app.name} {app.isVerified && <CheckCircle2 size={12} className="text-blue-500" />}</h4>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                        <Star size={10} className="text-yellow-400 fill-current" /> {app.rating} · {app.jobsCompleted} jobs
                      </div>
                    </div>
                    <button onClick={() => toggleSelect(app.id)} className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", selected.includes(app.id) ? "bg-accent border-accent text-white" : "border-gray-200")}>
                      {selected.includes(app.id) && <Check size={14} />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {app.skills.map(s => <span key={s} className="px-2 py-0.5 bg-gray-100 text-[9px] font-bold text-text-secondary rounded-full">{s}</span>)}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", app.availability === 'available' ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
                      {app.availability === 'available' ? 'Available' : 'Assigned Elsewhere'}
                    </span>
                    <div className="flex gap-2">
                       <button className="p-2 bg-gray-50 rounded-lg text-error"><X size={14} /></button>
                       <button className="p-2 bg-success text-white rounded-lg"><Check size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selected.length > 0 && (
          <div className="p-6 bg-white safe-area-bottom shadow-2xl">
            <Button onClick={() => navigate('match_confirmed')}>Send Offer to {selected.length} Workers</Button>
          </div>
        )}
      </div>
    );
  };

  const MatchConfirmed = () => (
    <div className="h-full bg-white flex flex-col items-center justify-start pt-16 pb-24 p-8 gap-8 overflow-y-auto no-scrollbar">
      <div className="text-center space-y-2">
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          transition={{ type: "spring", damping: 10 }}
          className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <span className="text-6xl">🎉</span>
        </motion.div>
        <h2 className="text-3xl font-bold text-primary">You're Matched!</h2>
        <p className="text-text-secondary">A new partnership has been formed for the upcoming gig.</p>
      </div>

      <div className="w-full bg-bg-light rounded-[32px] p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl p-3 flex items-center justify-center shadow-sm">
            <ChefHat size={32} className="text-accent" />
          </div>
          <div>
            <h4 className="font-bold">Bokeh Serving</h4>
            <p className="text-xs text-text-secondary">Sun, 11 May · Sai Caterers</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button variant="outline" className="py-3 text-xs" onClick={() => {}}>Add to Calendar</Button>
          <Button variant="secondary" className="py-3 text-xs" onClick={() => navigate('coworker_connect')}>View your Team</Button>
        </div>
        <Button variant="outline" className="py-3 text-xs w-full bg-accent/10 border-accent/20 text-accent" onClick={() => navigate('chat')}>Open Team Chat</Button>
      </div>

      <Button onClick={() => navigate(role === 'worker' ? 'worker_home' : 'tender_home')}>Back to Dashboard</Button>
    </div>
  );

  const CoworkerConnect = () => (
    <div className="h-full bg-bg-light flex flex-col">
       <div className="p-6 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(role === 'worker' ? 'worker_home' : 'tender_home')}><ArrowLeft size={24} /></button>
            <div>
              <h2 className="font-bold text-lg">Your Team</h2>
              <p className="text-[10px] text-text-secondary font-bold">BOKEH SERVING · 11 MAY</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('chat')}
            className="w-10 h-10 bg-green-50 text-success rounded-full flex items-center justify-center relative"
          >
            <MessageCircle size={20} />
            <div className="absolute top-0 right-0 w-3 h-3 bg-error rounded-full border-2 border-white" />
          </button>
       </div>

       <div className="p-6 flex-1 space-y-6 overflow-y-auto no-scrollbar">
          <div className="space-y-3">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Team Members</h3>
             <TeamMemberCard name="Priya Nair" rating={4.6} status="Confirmed" photo="https://i.pravatar.cc/100?u=a2" />
             <TeamMemberCard name="Meena Raj" rating={4.9} status="Confirmed" photo="https://i.pravatar.cc/100?u=a4" />
          </div>

          <div className="p-4 bg-primary text-white rounded-2xl space-y-4">
             <h3 className="font-bold text-sm">Transport Coordination</h3>
             <div className="space-y-3">
                <CoordItem mode="🚇" name="Rahul" from="Majestic" time="35 min" />
                <CoordItem mode="🛺" name="Priya" from="Koramangala" time="20 min" />
                <CoordItem mode="🚶" name="Meena" from="Indiranagar" time="10 min" />
             </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Coordination Chat</h3>
            <div className="bg-white p-4 rounded-2xl shadow-sm space-y-3">
               <ChatMessage name="Rahul" text="Hey team! I'm taking the metro, will reach by 5:15." time="10:30 AM" isMe />
               <ChatMessage name="Priya" text="I'll take an auto, should be there by 5:30!" time="10:45 AM" />
               <Button variant="ghost" onClick={() => navigate('chat')} className="text-xs py-2 h-auto text-accent">Open Group Chat</Button>
            </div>
          </div>
       </div>
    </div>
  );

  const TeamMemberCard = ({ name, rating, status, photo }: any) => (
    <div className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <img src={photo} className="w-10 h-10 rounded-full object-cover" alt="" />
        <div>
          <h4 className="text-sm font-bold">{name}</h4>
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
             <Star size={10} className="text-yellow-400 fill-current" /> {rating} · <span className="text-success">{status}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="p-2 bg-success/10 text-success rounded-lg"><Phone size={14} /></button>
        <button className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MessageCircle size={14} /></button>
      </div>
    </div>
  );

  const CoordItem = ({ mode, name, from, time }: any) => (
    <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-white/10 last:border-0 last:pb-0">
      <div className="flex items-center gap-2">
        <span className="text-lg">{mode}</span>
        <span>{name} — {from}</span>
      </div>
      <span className="text-blue-200">{time}</span>
    </div>
  );

  const ChatMessage = ({ name, text, time, isMe = false }: any) => (
    <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
      <div className={cn("max-w-[80%] p-3 rounded-2xl text-[11px] font-medium leading-relaxed", isMe ? "bg-accent text-white rounded-tr-none" : "bg-gray-50 text-text-primary rounded-tl-none")}>
        {text}
      </div>
      <span className="text-[10px] text-gray-400 mt-1">{time}</span>
    </div>
  );

  const OptionCard = ({ icon, label, selected = false }: any) => (
    <div className={cn("p-4 border-2 rounded-2xl flex flex-col items-center gap-3 transition-all", selected ? "border-accent bg-accent/5 text-accent" : "border-gray-100 text-gray-400")}>
      {React.cloneElement(icon, { size: 32 })}
      <span className="text-xs font-bold">{label}</span>
    </div>
  );

  const Toggle = ({ active }: { active: boolean }) => (
    <div className={cn("w-10 h-5 rounded-full p-0.5", active ? "bg-success" : "bg-gray-300")}>
      <div className={cn("w-4 h-4 bg-white rounded-full transition-all", active ? "translate-x-5" : "translate-x-0")} />
    </div>
  );

  const TenderSetup = () => {
    const isEditing = !!tenderName;
    const [step, setStep] = useState(1);
    const [localTenderInput, setLocalTenderInput] = useState(tenderName);
    const [localGstInput, setLocalGstInput] = useState(tenderGst);
    const [localServices, setLocalServices] = useState<string[]>(tenderServices.length ? tenderServices : ['Catering']);
    const [localLocation, setLocalLocation] = useState(tenderLocation);

    const showStep1 = isEditing || step === 1;
    const showStep2 = isEditing || step === 2;

    const handleSave = () => {
      setTenderName(localTenderInput.trim());
      setTenderGst(localGstInput.trim());
      setTenderServices(localServices);
      setTenderLocation(localLocation);
      navigate(isEditing ? 'tender_profile' : 'tender_home');
    };

    return (
      <div className="h-full p-8 flex flex-col bg-bg-light overflow-y-auto no-scrollbar pb-24">
        <div className="flex items-center justify-between mb-8 mt-4">
          <button onClick={() => {
            if (!isEditing && step > 1) setStep(step - 1);
            else navigate(isEditing ? 'tender_profile' : 'auth');
          }}>
            <ArrowLeft size={24} />
          </button>
          <div className="flex gap-1.5">
            {!isEditing ? [1, 2].map(i => (
              <div key={i} className={cn("w-6 h-1.5 rounded-full", i <= step ? "bg-accent" : "bg-gray-300")} />
            )) : <span className="text-sm font-bold text-gray-500">Edit Profile</span>}
          </div>
        </div>

        {showStep1 && (
          <div className={cn("space-y-6", isEditing && "mb-8")}>
            {(!isEditing) && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Business Info</h2>
                <p className="text-text-secondary">Register your catering or shifting business</p>
              </div>
            )}
            
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gray-200 rounded-2xl flex items-center justify-center relative mb-2 overflow-hidden">
                <Building2 size={40} className="text-gray-400" />
                <button className="absolute bottom-0 right-0 p-2 bg-accent text-white rounded-full shadow-lg">
                  <Plus size={16} />
                </button>
              </div>
              <span className="text-xs font-bold text-accent">Upload Logo</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Business Name</label>
                <input type="text" value={localTenderInput} onChange={(e) => setLocalTenderInput(e.target.value)} className="w-full bg-white rounded-lg p-3 border border-gray-200 outline-none" placeholder="Your Business Name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">GST Number (Optional)</label>
                <input type="text" value={localGstInput} onChange={(e) => setLocalGstInput(e.target.value)} className="w-full bg-white rounded-lg p-3 border border-gray-200 outline-none" placeholder="29XXXXX..." />
              </div>
            </div>
            {!isEditing && (
              <Button disabled={!localTenderInput.trim()} onClick={() => {
                setTenderName(localTenderInput.trim());
                setTenderGst(localGstInput.trim());
                setStep(2);
              }}>Continue</Button>
            )}
          </div>
        )}

        {showStep2 && (
          <div className="space-y-6">
            {(!isEditing) && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Service Details</h2>
                <p className="text-text-secondary">What services do you provide?</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">Service Type</label>
                <div className="flex gap-2">
                  {['Catering', 'Home Shifting', 'Both'].map(s => (
                    <button 
                      key={s} 
                      onClick={() => setLocalServices([s])}
                      className={cn("px-4 py-2 border rounded-full text-xs font-bold shadow-sm transition-colors", localServices.includes(s) ? "bg-accent text-white border-accent" : "bg-white border-gray-100")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Primary Location</label>
                <select value={localLocation} onChange={(e) => setLocalLocation(e.target.value)} className="w-full bg-white rounded-lg p-3 border border-gray-200 outline-none font-bold">
                  <option>Bengaluru</option>
                  <option>Mysuru</option>
                </select>
              </div>
            </div>
            
            {!isEditing ? (
              <Button onClick={handleSave}>Complete Setup</Button>
            ) : (
              <div className="pt-6">
                <Button disabled={!localTenderInput.trim()} onClick={handleSave}>Save Changes</Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const ChatScreen = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const roomId = selectedJob ? selectedJob.id : 'general';

    useEffect(() => {
      // Connect to websocket server
      socketRef.current = io({ path: '/socket.io' });

      socketRef.current.on('connect', () => {
        console.log('Connected to chat server');
        socketRef.current?.emit('join_room', roomId);
      });

      socketRef.current.on('past_messages', (pastMessages) => {
        setMessages(pastMessages);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });

      socketRef.current.on('receive_message', (message) => {
        setMessages((prev) => [...prev, message]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });

      return () => {
        socketRef.current?.disconnect();
      };
    }, [roomId]);

    const sendMessage = () => {
      if (!messageInput.trim() || !socketRef.current) return;
      
      const newMessage = {
        id: Date.now().toString(),
        text: messageInput.trim(),
        senderId: role === 'worker' ? workerName : tenderName,
        senderRole: role,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      socketRef.current.emit('send_message', { roomId, message: newMessage });
      setMessageInput('');
    };

    return (
      <div className="h-full bg-bg-light flex flex-col">
        <div className="p-6 bg-white shadow-sm flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(role === 'worker' ? 'coworker_connect' : 'match_confirmed')}><ArrowLeft size={24} /></button>
            <div>
              <h2 className="font-bold text-lg">Team Chat</h2>
              <p className="text-[10px] text-text-secondary">{selectedJob?.tenderName || 'Sai Caterers'} - 11 May</p>
            </div>
          </div>
          <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
             <div className="w-2 h-2 bg-success rounded-full" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-center text-xs text-gray-400 my-4 bg-white/50 py-1 rounded-full mx-auto w-max px-4">Chat started</div>
          {messages.map((msg) => {
            const isMe = msg.senderId === (role === 'worker' ? workerName : tenderName);
            return (
              <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                <span className="text-[10px] text-gray-500 mb-1 ml-1">{isMe ? 'You' : msg.senderId} ({msg.senderRole})</span>
                <div className={cn("p-3 rounded-2xl", isMe ? "bg-accent text-white rounded-br-sm" : "bg-white text-text-primary border border-gray-100 shadow-sm rounded-bl-sm")}>
                  <p className="text-sm">{msg.text}</p>
                </div>
                <span className="text-[9px] text-gray-400 mt-1">{msg.timestamp}</span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100 safe-area-bottom">
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-3 text-sm outline-none focus:border-accent"
            />
            <button 
              onClick={sendMessage}
              disabled={!messageInput.trim()}
              className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PaymentsScreen = () => (
    <div className="h-full bg-bg-light flex flex-col">
       <div className="p-6 bg-white shadow-sm flex items-center gap-4">
          <button onClick={() => navigate(role === 'worker' ? 'worker_home' : 'tender_home')}><ArrowLeft size={24} /></button>
          <h2 className="font-bold text-lg">Payments</h2>
       </div>

       <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
          <div className="bg-gradient-to-br from-primary to-primary-light p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10 space-y-4">
                <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">{role === 'worker' ? 'Available Balance' : 'Total Spent Month'}</p>
                <h3 className="text-4xl font-bold font-display">{role === 'worker' ? '₹3,200' : '₹24,600'}</h3>
                <Button variant="primary" className="py-2.5 h-auto rounded-xl shadow-lg">
                  {role === 'worker' ? 'Withdraw to UPI' : 'Add Credits'}
                </Button>
             </div>
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h3 className="font-bold">Transaction History</h3>
                <Filter size={16} className="text-gray-400" />
             </div>
             <div className="space-y-3">
                <TransactionItem title="Bokeh Serving — Sai Caterers" date="11 May" amount="₹900" status="paid" />
                <TransactionItem title="Manual Serving" date="10 May" amount="₹1,200" status="pending" />
                <TransactionItem title="Packing — QuickShift" date="5 May" amount="₹1,200" status="paid" />
             </div>
          </div>
       </div>
    </div>
  );

  const TransactionItem = ({ title, date, amount, status }: any) => (
    <div className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-sm border border-gray-50">
       <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", status === 'paid' ? "bg-success/10 text-success" : "bg-warning/10 text-orange-500")}>
             {status === 'paid' ? <Check size={18} /> : <Clock size={18} />}
          </div>
          <div>
             <h4 className="text-sm font-bold truncate max-w-[150px]">{title}</h4>
             <p className="text-[10px] text-gray-400 font-bold">{date}</p>
          </div>
       </div>
       <div className="text-right">
          <p className="font-bold text-primary">{amount}</p>
          <span className={cn("text-[9px] font-bold uppercase", status === 'paid' ? "text-success" : "text-orange-500")}>
             {status}
          </span>
       </div>
    </div>
  );

  const NotificationsPanel = () => {
    return (
      <motion.div 
        initial={{ y: -100, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="absolute top-16 left-4 right-4 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100"
      >
        <div className="p-4 bg-primary text-white flex items-center justify-between">
          <h4 className="font-bold text-sm">Notifications</h4>
          <button onClick={() => setShowNotifications(false)}><X size={16}/></button>
        </div>
        <div className="max-h-[300px] overflow-y-auto no-scrollbar">
          <NotificationItem icon="🎉" text="Matched with Sai Caterers!" time="2 min ago" />
          <NotificationItem icon="📋" text="New job: Bokeh Serving nearby" time="1 hr ago" />
          <NotificationItem icon="⭐" text="Annapurna rated you 4 stars" time="3 hrs ago" />
        </div>
        <button onClick={() => setShowNotifications(false)} className="w-full py-3 text-[10px] font-bold text-accent uppercase bg-gray-50 tracking-widest hover:bg-gray-100 transition-colors">Mark all as read</button>
      </motion.div>
    );
  };

  const NotificationItem = ({ icon, text, time }: any) => (
    <div className="p-4 flex gap-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="text-xs font-medium text-text-primary">{text}</p>
        <span className="text-[10px] text-gray-400">{time}</span>
      </div>
    </div>
  );

  const ReviewRatingScreen = () => (
    <div className="h-full bg-white p-8 flex flex-col items-center text-center">
       <button onClick={() => navigate('worker_home')} className="self-start mb-10"><X size={24} /></button>
       
       <div className="w-20 h-20 bg-accent/5 rounded-2xl flex items-center justify-center mb-6">
          <Star size={40} className="text-accent fill-current" />
       </div>
       <h2 className="text-2xl font-bold mb-2">Rate your experience</h2>
       <p className="text-text-secondary text-sm mb-8">How was your work with <b>Sai Caterers</b> at Indiranagar?</p>

       <div className="flex gap-2 mb-8">
          {[1,2,3,4,5].map(i => <Star key={i} size={32} className="text-yellow-400 fill-current hover:scale-110 transition-transform cursor-pointer" />)}
       </div>

       <div className="w-full space-y-4 mb-8">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">What went well?</h4>
          <div className="flex flex-wrap justify-center gap-2">
             {['Paid on Time', 'Safe Environment', 'Communication', 'Friendly', 'Organized'].map(tag => (
               <button key={tag} className="px-4 py-2 border border-gray-100 rounded-full text-xs font-bold hover:bg-accent hover:text-white hover:border-accent">{tag}</button>
             ))}
          </div>
       </div>

       <textarea 
          placeholder="Share more about your experience..." 
          className="w-full flex-1 p-4 bg-bg-light rounded-2xl border-none outline-none text-sm resize-none mb-6"
       />

       <Button onClick={() => navigate('worker_home')}>Submit Review</Button>
    </div>
  );

  const MyJobsScreen = () => (
    <div className="h-full bg-bg-light flex flex-col">
       <div className="p-6 bg-white shadow-sm flex items-center justify-between">
          <h2 className="font-bold text-lg">My Jobs</h2>
       </div>
       <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-2">
             <Briefcase size={40} className="text-gray-400" />
          </div>
          <h3 className="font-bold text-lg">No active jobs</h3>
          <p className="text-text-secondary text-sm px-8">You haven't been assigned to any jobs yet. Apply to some gigs on the home screen!</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('worker_home')}>Find Jobs</Button>
       </div>
    </div>
  );

  // --- Main Render Updated Again ---

  return (
    <PhoneFrame hideNav={currentScreen === 'splash' || currentScreen === 'role_selection' || currentScreen === 'auth' || currentScreen === 'worker_setup' || currentScreen === 'tender_setup' || currentScreen === 'chat'} currentScreen={currentScreen} role={role} navigate={navigate}>
      <AnimatePresence mode="wait">
        <motion.div
           key={currentScreen}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           className="h-full overflow-hidden relative"
        >
          {showNotifications && !['splash', 'auth', 'role_selection', 'worker_setup', 'tender_setup'].includes(currentScreen) && <NotificationsPanel />}
          
          {currentScreen === 'splash' && <SplashScreen />}
          {currentScreen === 'role_selection' && <RoleSelection />}
          {currentScreen === 'auth' && <AuthScreen />}
          {currentScreen === 'worker_setup' && <WorkerSetup />}
          {currentScreen === 'worker_home' && WorkerHome()}
          {currentScreen === 'job_detail' && <JobDetail />}
          {currentScreen === 'worker_profile' && WorkerProfile()}
          {currentScreen === 'my_jobs' && <MyJobsScreen />}
          
          {/* Tender Screens */}
          {currentScreen === 'tender_setup' && <TenderSetup />}
          {currentScreen === 'tender_home' && <TenderHome />}
          {currentScreen === 'job_posting' && <JobPostingFlow />}
          {currentScreen === 'applicant_review' && <ApplicantReview />}
          {currentScreen === 'match_confirmed' && <MatchConfirmed />}
          {currentScreen === 'coworker_connect' && <CoworkerConnect />}
          {currentScreen === 'chat' && <ChatScreen />}
          
          {/* Shared Final Screens */}
          {currentScreen === 'payments' && <PaymentsScreen />}
          {currentScreen === 'review_rating' && <ReviewRatingScreen />}
          {/* Tender Profile uses similar layout, just needs navigate mapping */}
          {currentScreen === 'tender_profile' && WorkerProfile()} 
        </motion.div>
      </AnimatePresence>
    </PhoneFrame>
  );
}
