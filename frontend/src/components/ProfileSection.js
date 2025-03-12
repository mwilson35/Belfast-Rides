import React from 'react';

const ProfileSection = ({ profile }) => {
  // Construct a full URL. If profilePicUrl doesn't start with "http", prefix it.
  const imageUrl =
    profile && profile.profilePicUrl
      ? profile.profilePicUrl.startsWith('http')
        ? profile.profilePicUrl
        : `http://localhost:5000/${profile.profilePicUrl}`
      : null;

  return (
    <section className="profile-section">
      <h2>Your Profile</h2>
      {profile ? (
        <div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Profile"
              style={{ width: '100px', height: '100px', borderRadius: '50%' }}
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
