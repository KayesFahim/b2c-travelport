import React, { useState } from 'react';

const mockResults = [
  { name: 'Hotel Sunshine', location: 'Paris, France' },
  { name: 'Ocean View Resort', location: 'Malaga, Spain' },
];

export default function HotelSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Replace with HotelBeds API call
    setTimeout(() => {
      setResults(
        mockResults.filter(hotel =>
          hotel.location.toLowerCase().includes(query.toLowerCase()) ||
          hotel.name.toLowerCase().includes(query.toLowerCase())
        )
      );
      setLoading(false);
    }, 500);
  };

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Search Hotels</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Enter location or country name"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      <div>
        {results.length > 0 ? (
          <ul>
            {results.map((hotel, idx) => (
              <li key={idx} className="mb-3 p-3 border rounded">
                <div className="font-semibold">{hotel.name}</div>
                <div className="text-gray-600">{hotel.location}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">No results found.</div>
        )}
      </div>
    </div>
  );
}
