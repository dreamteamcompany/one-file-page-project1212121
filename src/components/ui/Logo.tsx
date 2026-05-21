const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <img
      src="https://cdn.poehali.dev/projects/1bde8275-3fbd-44e1-b7ff-9b0123cbb82a/bucket/a996c3b6-6f0c-4e36-9d0d-2e22a7361de4.png"
      alt="Logo"
      className={className}
    />
  );
};

export default Logo;
