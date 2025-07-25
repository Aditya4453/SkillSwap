import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Navbar from '../Components/Navbar';

const MySwap = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [incomingSwaps, setIncomingSwaps] = useState([]);
  const [outgoingSwaps, setOutgoingSwaps] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    const fetchSwaps = async () => {
      if (!currentUser) return;

      // Fetch all swaps involving this user
      const incomingQuery = query(collection(db, 'swaps'), where('to', '==', currentUser.uid));
      const outgoingQuery = query(collection(db, 'swaps'), where('from', '==', currentUser.uid));

      const [incomingSnap, outgoingSnap] = await Promise.all([
        getDocs(incomingQuery),
        getDocs(outgoingQuery),
      ]);

      const incoming = incomingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const outgoing = outgoingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setIncomingSwaps(incoming);
      setOutgoingSwaps(outgoing);

      // Fetch user names for mapping
      const allUserIds = new Set([
        ...incoming.map(s => s.from),
        ...incoming.map(s => s.to),
        ...outgoing.map(s => s.from),
        ...outgoing.map(s => s.to),
      ]);

      const usersMapTemp = {};
      for (let uid of allUserIds) {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          usersMapTemp[uid] = userSnap.data().name;
        }
      }
      setUsersMap(usersMapTemp);
    };

    fetchSwaps();
  }, [currentUser]);

  const handleResponse = async (id, response) => {
    await updateDoc(doc(db, 'swaps', id), {
      status: response,
    });
    // Refresh swap list
    setIncomingSwaps(prev =>
      prev.map(swap => (swap.id === id ? { ...swap, status: response } : swap))
    );
  };

  return (
    <div className="min-h-screen bg-background p-6 font-body">
      <Navbar />

      <div className="grid md:grid-cols-2 gap-8 m-6">
        {/* Incoming Requests */}
        <div className="bg-tertiary p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Incoming Requests</h3>
          {incomingSwaps.length === 0 ? (
            <p>No incoming requests.</p>
          ) : (
            incomingSwaps.map(swap => (
              <div key={swap.id} className="border-b pb-4 mb-4">
                <p><strong>From:</strong> {usersMap[swap.from] || swap.from}</p>
                <p><strong>Status:</strong> {swap.status}</p>
                {swap.status === 'pending' && (
                  <div className="mt-2 flex gap-4">
                    <button
                      onClick={() => handleResponse(swap.id, 'accepted')}
                      className="bg-green-500 text-white px-4 py-1 rounded"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleResponse(swap.id, 'declined')}
                      className="bg-red-500 text-white px-4 py-1 rounded"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Outgoing Requests */}
        <div className="bg-tertiary p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Outgoing Requests</h3>
          {outgoingSwaps.length === 0 ? (
            <p>No outgoing requests.</p>
          ) : (
            outgoingSwaps.map(swap => (
              <div key={swap.id} className="border-b pb-4 mb-4">
                <p><strong>To:</strong> {usersMap[swap.to] || swap.to}</p>
                <p><strong>Status:</strong> {swap.status}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MySwap;
