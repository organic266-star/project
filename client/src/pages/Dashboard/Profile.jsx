const Profile = ({ user, onClose }) => {
  return (
    <div className="p-6 bg-[#1b2230] rounded-2xl shadow-lg text-white">
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>
      <p><strong>Full Name:</strong> {user.fullname}</p>
      <p><strong>Username:</strong> {user.username}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Role:</strong> {user.role}</p>
      <p><strong>Skills:</strong> {user.skills.join(", ")}</p>
      <p><strong>Looking For:</strong> {user.lookingFor}</p>

      <div className="mt-6 flex gap-4">
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500"
        >
          Close
        </button>
        <button 
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg hover:opacity-90"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export default Profile;
