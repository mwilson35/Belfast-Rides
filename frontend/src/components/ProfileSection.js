
import React from 'react';

const ProfileSection = ({ profile }) => (
  <section className="profile-section">
    <h2>Your Profile</h2>
    {profile ? (
      <div>
        <p><strong>Name:</strong> {profile.username}</p>
        <p><strong>Email:</strong> {profile.email}</p>
      </div>
    ) : (
      <p>Loading profile...</p>
    )}
  </section>
);

export default ProfileSection;
