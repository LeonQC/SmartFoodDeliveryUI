'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '@/services/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store/hooks';
import { setAddressList } from '@/store/slices/addressSlice';

interface Restaurant {
  merchantId: number;
  merchantName: string;
  address: string;
  merchantDescription: string;
  merchantType: string;
  merchantStatus: string;
  distance: number;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  rating: number;
  merchantImage?: string;
}

interface FetchResult {
  rows: Restaurant[];
  lastValue: number;
  lastId: number;
}

const PAGE_SIZE = 5;
const SORT_OPTIONS = [
  { label: 'Distance', value: 'distance' },
  { label: 'Favorites', value: 'favoriteCount' },
  { label: 'Comments', value: 'commentCount' },
  { label: 'Rating', value: 'rating' },
];

export default function BrowsePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [sortField, setSortField] = useState<string>('distance');
  const [lastValue, setLastValue] = useState<number | null>(null);
  const [lastId, setLastId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const didInitRef = useRef(false);

  // get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: 0, lng: 0 })
    );
  }, []);
  
  // save address book into redux
  useEffect(() => {
    apiClient.get('/client/address')
      .then(res => dispatch(setAddressList(res.data.data || [])))
      .catch(() => dispatch(setAddressList([])))
  }, [dispatch])

  // fetch first page when coords available
  useEffect(() => {
    if (coords) fetchNext();
  }, [coords]);

  const fetchNext = useCallback(async () => {
    if (loading || !coords || !hasMore) return;
    setLoading(true);
    try {
      const response = await apiClient.post('/client/browse', {
        latitude: coords.lat,
        longitude: coords.lng,
        sortField,
        lastValue,
        lastId,
        pageSize: PAGE_SIZE,
      });
      const result: FetchResult = response.data.data;
      if (result.rows.length < PAGE_SIZE) setHasMore(false);
      setRestaurants(prev => [...prev, ...result.rows]);
      setLastValue(result.lastValue);
      setLastId(result.lastId);
    } catch (err) {
      toast.error('Failed to fetch restaurants:');
    } finally {
      setLoading(false);
    }
  }, [coords, sortField, lastValue, lastId, loading, hasMore]);

  // reset when sort changes
  useEffect(() => {
    setRestaurants([]);
    setLastValue(null);
    setLastId(null);
    setHasMore(true);
    didInitRef.current = false;
    if (coords) fetchNext();
  }, [sortField]);

  // infinite scroll observer
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (!didInitRef.current) {
        didInitRef.current = true;
        return;
      }
      if (entries[0].isIntersecting) fetchNext();
    });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [fetchNext]);

  return (
    <div className="p-4 w-full">
      <div className="flex items-center justify-end mb-4">
        <h1 className="text-lg font-medium mr-3">Sorted by:</h1>
        <Select value={sortField} onValueChange={setSortField}>
        <SelectTrigger className="w-[180px] border border-gray-300 rounded focus:outline-none focus:ring-0 data-[state=open]:border-gray-500 data-[state=open]:ring-2 data-[state=open]:ring-yellow-200 transition-colors duration-150">
            {SORT_OPTIONS.find(o => o.value === sortField)?.label}
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4">
        {restaurants.map(r => (
          <motion.div
            key={r.merchantId}
            onClick={() => router.push(`/client/browse/${r.merchantId}`)}
            className="cursor-pointer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="relative flex items-center gap-4 h-40 w-full overflow-hidden">
              {/* 店铺状态 */}
              <span className="absolute top-2 right-2 text-sm font-semibold text-red-500">
                {r.merchantStatus === '1' ? '营业中' : '已打烊'}
              </span>
              {/* 评分 */}
              <span className="absolute bottom-2 right-2 text-sm font-semibold text-yellow-500">
                ⭐ {r.rating ?? 'N/A'}
              </span>
              {r.merchantImage ? (
                <img 
                  src={`/api/images?key=${encodeURIComponent(r.merchantImage)}`}
                  alt={r.merchantName}
                  className="w-32 h-32 object-cover rounded ml-2"
                />
                ) : (
                  <div className="w-32 h-32 rounded bg-gray-300 flex items-center justify-center ml-2">
                    无图
                  </div>
              )}
              <CardContent className="flex-1 h-full flex flex-col justify-center p-4">
                <h2 className="text-xl font-semibold mb-1">{r.merchantName}</h2>
                <p className="text-sm text-black mb-1">{r.address}</p>
                <p className="text-sm mb-1">{r.merchantDescription}</p>
                <p className="text-sm mb-2">Type: {r.merchantType}</p>
                <p className="text-sm mb-2">
                  {r.distance < 1000
                    ? `${Math.round(r.distance)} m away`
                    : `${(r.distance / 1000).toFixed(2)} km away`}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      {loading && <p className="text-center mt-4">Loading...</p>}
      <div ref={sentinelRef} className="h-1"></div>
      {!hasMore && <p className="text-center mt-4">No more restaurants.</p>}
    </div>
  );
}
