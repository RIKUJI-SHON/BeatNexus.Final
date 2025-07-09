import React from 'react';

const NewsSidebar: React.FC = () => {
  return (
    <div className="w-full hidden lg:block space-y-4">
      {/* Latest News title badge */}
      <img
        src="/images/LATEST%20NEWS.png"
        alt="Latest News"
        className="w-full h-auto object-contain"
      />
      {/* TODO: News items will be rendered here in future steps */}
    </div>
  );
};

export default NewsSidebar; 