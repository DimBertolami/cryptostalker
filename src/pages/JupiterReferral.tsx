import React from 'react';
import JupiterReferralManagerComponent from '../components/JupiterReferralManager';
import './JupiterReferral.css';

const JupiterReferral: React.FC = () => {
  return (
    <div className="jupiter-referral-page">
      <div className="jupiter-referral-header">
        <h1>Jupiter Referral Manager</h1>
        <p>Set up and manage your Jupiter Ultra referral accounts to earn fees from swaps</p>
      </div>
      <div className="jupiter-referral-container">
        <JupiterReferralManagerComponent />
      </div>
    </div>
  );
};

export default JupiterReferral;
