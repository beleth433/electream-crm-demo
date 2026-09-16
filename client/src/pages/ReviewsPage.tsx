import React, { useState, useEffect } from 'react';
import { Review, Bike, Client } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { Star, Plus, MessageSquare, ThumbsUp, Bike as BikeIcon } from 'lucide-react';
import { toast } from 'sonner';

export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Add review modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({
    clientId: '',
    bikeId: '',
    rating: 5,
    comment: '',
  });

  const loadData = () => {
    setIsLoading(true);
    Promise.all([api.getReviews(), api.getBikes(), api.getClients()])
      .then(([revRes, bikesRes, clientsRes]) => {
        setReviews(revRes);
        setBikes(bikesRes);
        setClients(clientsRes);
        if (clientsRes.length > 0 && bikesRes.length > 0 && !newReviewForm.clientId) {
          setNewReviewForm((prev) => ({
            ...prev,
            clientId: clientsRes[0].id,
            bikeId: bikesRes[0].id,
          }));
        }
      })
      .catch((err) => toast.error('Ошибка загрузки отзывов: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createReview(newReviewForm);
      toast.success('Отзыв курьера успешно зафиксирован!');
      setIsAddModalOpen(false);
      setNewReviewForm({
        clientId: clients[0]?.id || '',
        bikeId: bikes[0]?.id || '',
        rating: 5,
        comment: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения отзыва');
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Система сбора отзывов курьеров
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Контроль качества парка, обратная связь по моделям электровелосипедов и комфорту
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Зафиксировать отзыв курьера
        </button>
      </div>

      {/* Average score card */}
      <div className="p-5 contour-card flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-amber-500/20">
            {avgRating}
          </div>
          <div>
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Средняя оценка парка на основе {reviews.length} отзывов курьеров
            </p>
          </div>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="p-5 contour-card space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  {rev.client?.fullName}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(rev.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                  {rev.client?.courierService || 'Яндекс Еда'}
                </span>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${
                        s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 mt-3 leading-relaxed italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                «{rev.comment || 'Без текстового комментария'}»
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                <BikeIcon className="w-3.5 h-3.5" />
                {rev.bike?.inventoryNumber}
              </span>
              <span>{rev.bike?.modelName}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Review */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Зафиксировать отзыв курьера"
        subtitle="Оценка качества байка и сервиса"
        maxWidth="md"
      >
        <form onSubmit={handleCreateReview} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">Курьер *</label>
            <select
              required
              value={newReviewForm.clientId}
              onChange={(e) => setNewReviewForm({ ...newReviewForm, clientId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.courierService || 'Курьер'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Электровелосипед *</label>
            <select
              required
              value={newReviewForm.bikeId}
              onChange={(e) => setNewReviewForm({ ...newReviewForm, bikeId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              {bikes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.inventoryNumber} — {b.model?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Оценка техники (1-5 звезд) *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setNewReviewForm({ ...newReviewForm, rating: star })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    newReviewForm.rating === star
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  ★ {star}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Текст отзыва / комментарий</label>
            <textarea
              rows={3}
              placeholder="Как держит заряд батарея, удобство посадки, работа тормозов..."
              value={newReviewForm.comment}
              onChange={(e) => setNewReviewForm({ ...newReviewForm, comment: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm"
            >
              Сохранить отзыв
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
