/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'worker' | 'tender' | null;

export type Screen = 
  | 'splash'
  | 'role_selection'
  | 'auth'
  | 'worker_setup'
  | 'tender_setup'
  | 'worker_home'
  | 'tender_home'
  | 'job_posting'
  | 'job_detail'
  | 'applicant_review'
  | 'match_confirmed'
  | 'coworker_connect'
  | 'chat'
  | 'review_rating'
  | 'worker_profile'
  | 'tender_profile'
  | 'payments'
  | 'my_jobs'
  | 'listings'
  | 'notifications';

export interface Job {
  id: string;
  tenderName: string;
  tenderRating: number;
  isVerified: boolean;
  type: 'Catering' | 'Home Shifting';
  subType: string;
  date: string;
  time: string;
  location: string;
  distance: string;
  transport: string;
  pay: string;
  payType: 'hourly' | 'fixed';
  food: string;
  travel: string;
  foodType: 'Veg' | 'Non-Veg' | 'Both' | 'N/A';
  spotsTotal: number;
  spotsFilled: number;
  status?: 'active' | 'applied' | 'assigned' | 'pending' | 'full';
}

export interface Applicant {
  id: string;
  name: string;
  rating: number;
  jobsCompleted: number;
  isVerified: boolean;
  skills: string[];
  availability: 'available' | 'assigned' | 'unavailable';
  foodComfort: boolean;
  photo: string;
}
