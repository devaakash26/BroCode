export default function TestTailwind() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">Testing Tailwind CSS</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-6">This page is for testing if Tailwind CSS is working properly.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-100 p-4 rounded-lg shadow">
          <h2 className="text-red-800 font-bold">Red Card</h2>
          <p className="text-red-600">This should have a red background and text.</p>
        </div>
        
        <div className="bg-blue-100 p-4 rounded-lg shadow">
          <h2 className="text-blue-800 font-bold">Blue Card</h2>
          <p className="text-blue-600">This should have a blue background and text.</p>
        </div>
        
        <div className="bg-green-100 p-4 rounded-lg shadow">
          <h2 className="text-green-800 font-bold">Green Card</h2>
          <p className="text-green-600">This should have a green background and text.</p>
        </div>
      </div>
      
      <button className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
        Tailwind Button
      </button>
    </div>
  );
} 
