export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-card rounded-xl shadow-sm border border-border p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-2">HRMS</h1>
        <p className="text-text-muted">AI-Native Human Resource Management System</p>
        <div className="mt-6 space-y-3">
          <a
            href="/login"
            className="block w-full bg-primary text-white py-2.5 px-4 rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Sign In
          </a>
          <a
            href="/signup"
            className="block w-full border border-border py-2.5 px-4 rounded-lg hover:bg-background transition-colors font-medium"
          >
            Create Organization
          </a>
        </div>
      </div>
    </main>
  );
}
