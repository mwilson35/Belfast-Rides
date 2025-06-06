import React from 'react';
import '../styles/ProfileSection.css'; // Optional custom styling

const ProfileSection = ({ profile }) => {
  // Construct a full URL. If profilePicUrl doesn't start with "http", prefix it.
  const imageUrl =
    profile && profile.profilePicUrl
      ? profile.profilePicUrl.startsWith('http')
        ? profile.profilePicUrl
        : `http://192.168.33.3:5000/${profile.profilePicUrl}`
      : null;


  return (
    <section className="profile-section container my-4">
      <h2 className="text-center mb-3">Your Profile</h2>
      {profile ? (
        <div className="card p-3 shadow-sm">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Profile"
              className="profile-img mb-3"
            />
          ) : (
            <p>No profile picture available.</p>
          )}
          <p><strong>Name:</strong> {profile.username}</p>
          <p><strong>Email:</strong> {profile.email}</p>
        </div>
      ) : (
        <p>Loading profile...</p>
      )}
    </section>
  );
};

export default ProfileSection;
