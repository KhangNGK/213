
import React from 'react';

const Footer: React.FC = () => {
    return (
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 dark:text-gray-400">© 2024 TruyenOnline. Mọi bản quyền thuộc về tác giả.</p>
          <div className="mt-2 flex justify-center gap-4">
            <button className="text-sm hover:text-primary text-gray-500 transition-colors">Điều khoản</button>
            <button className="text-sm hover:text-primary text-gray-500 transition-colors">Chính sách bảo mật</button>
            <button className="text-sm hover:text-primary text-gray-500 transition-colors">Liên hệ</button>
          </div>
        </div>
      </footer>
    );
};

export default Footer;
