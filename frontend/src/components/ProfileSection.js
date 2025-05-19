import React from 'react';
import '../styles/ProfileSection.css'; 

const ProfileSection = ({ profile }) => {
  
  const imageUrl =
    profile && profile.profilePicUrl
      ? profile.profilePicUrl.startsWith('http')
        ? profile.profilePicUrl
        : `${process.env.REACT_APP_BACKEND_URL}/${profile.profilePicUrl}`

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
