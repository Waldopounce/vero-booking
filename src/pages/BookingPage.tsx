import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay, getDay } from "date-fns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type Step = 1 | 2 | 3 | 4;

interface BookingForm {
  caller_name: string;
  caller_phone: string;
  service_description: string;
}

interface CustomerAccount {
  id: string;
  business_name: string | null;
  slug: string;
}

// ─── Mini calendar ─────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function MiniCalendar({
  selected,
  onSelect,
}: {
  selected: Date | undefined;
  onSelect: (d: Date) => void;
}) {
  const today = startOfDay(new Date());
  const [viewDate, setViewDate] = useState(() => startOfMonth(today));

  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
  const leadingBlanks = getDay(startOfMonth(viewDate));

  const prevMonth = () => setViewDate((d) => startOfMonth(addDays(d, -1)));
  const nextMonth = () => setViewDate((d) => addDays(endOfMonth(d), 1));

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-slate-400 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const isDisabled = isBefore(day, today);
          const isSelected = selected && format(day, "yyyy-MM-dd") === format(selected, "yyyy-MM-dd");
          const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

          return (
            <button
              key={day.toISOString()}
              onClick={() => !isDisabled && onSelect(day)}
              disabled={isDisabled}
              className={[
                "h-9 w-full rounded text-sm transition-colors",
                isDisabled ? "text-slate-300 cursor-not-allowed" : "cursor-pointer hover:bg-vero-blue-light",
                isSelected ? "bg-vero-blue text-white hover:bg-vero-blue-dark font-semibold" : "",
                isToday && !isSelected ? "font-semibold text-vero-blue" : "",
                !isDisabled && !isSelected ? "text-slate-700" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Spinner ────────────────────────────────────────────────────────────────

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Date & Time" },
    { n: 2, label: "Your Details" },
    { n: 3, label: "Confirm" },
  ];
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map(({ n, label }, i) => (
        <div key={n} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={[
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                step > n
                  ? "bg-green-500 text-white"
                  : step === n
                  ? "bg-vero-blue text-white"
                  : "bg-slate-200 text-slate-400",
              ].join(" ")}
            >
              {step > n ? "✓" : n}
            </div>
            <span
              className={[
                "text-xs hidden sm:block",
                step >= n ? "text-slate-700 font-medium" : "text-slate-400",
              ].join(" ")}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px ${step > n ? "bg-green-400" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const BookingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [bookingResult, setBookingResult] = useState<{ booking_id: string } | null>(null);

  const form = useForm<BookingForm>({
    defaultValues: { caller_name: "", caller_phone: "", service_description: "" },
  });

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
    []
  );

  // Fetch customer account by slug
  const accountQuery = useQuery({
    enabled: !!slug,
    queryKey: ["customer_account", slug],
    queryFn: async () => {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/customer_account?slug=eq.${encodeURIComponent(slug!)}&select=id,business_name,slug&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to load business");
      const rows: CustomerAccount[] = await res.json();
      return rows[0] ?? null;
    },
  });

  const dateString = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;

  // Fetch available time slots
  const slotsQuery = useQuery({
    enabled: !!accountQuery.data?.id && !!dateString,
    queryKey: ["available_slots", accountQuery.data?.id, dateString, timezone],
    queryFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/check-availability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          customer_account_id: accountQuery.data!.id,
          date: dateString,
          timezone,
        }),
      });
      if (!res.ok) throw new Error(`check-availability failed: ${res.status}`);
      const data = await res.json();
      return (data.available_slots ?? []) as string[];
    },
  });

  // Submit booking
  const confirmMutation = useMutation({
    mutationFn: async (values: BookingForm) => {
      if (!accountQuery.data?.id || !dateString || !selectedTime) {
        throw new Error("Missing booking inputs");
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/confirm-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          customer_account_id: accountQuery.data.id,
          caller_name: values.caller_name,
          caller_phone: values.caller_phone,
          service_description: values.service_description,
          booking_date: dateString,
          booking_time: selectedTime,
          timezone,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`confirm-booking failed: ${res.status} ${detail}`);
      }
      return (await res.json()) as { success: boolean; booking_id: string };
    },
    onSuccess: (data) => {
      setBookingResult({ booking_id: data.booking_id });
      setStep(4);
    },
  });

  // Loading state
  if (accountQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8 text-vero-blue" />
      </div>
    );
  }

  // Business not found
  if (!accountQuery.isLoading && !accountQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-sm p-8 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <h1 className="text-lg font-semibold text-slate-800">Page not found</h1>
          <p className="text-sm text-slate-500">
            We couldn't find a booking page for "<strong>{slug}</strong>".
          </p>
        </Card>
      </div>
    );
  }

  const businessName = accountQuery.data?.business_name ?? "the business";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-vero-blue text-white text-lg font-bold mb-1">
            V
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{businessName}</h1>
          <p className="text-sm text-slate-500">Book an appointment online — it only takes a minute.</p>
        </div>

        {/* Step indicator */}
        {step < 4 && <StepIndicator step={step} />}

        {/* Step 1 — Date & Time */}
        {step === 1 && (
          <Card className="p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Choose a date</p>
              <MiniCalendar
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setSelectedTime(undefined);
                }}
              />
            </div>

            {dateString && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Available times for {format(selectedDate!, "EEEE, d MMMM")}
                </p>

                {slotsQuery.isLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                    <Spinner className="h-4 w-4 text-vero-blue" />
                    Loading available times…
                  </div>
                )}

                {slotsQuery.isError && (
                  <p className="text-sm text-red-600 py-2">
                    Couldn't load availability. Please try a different date.
                  </p>
                )}

                {slotsQuery.data?.length === 0 && (
                  <p className="text-sm text-slate-500 py-2">
                    No times available on this day — please choose another date.
                  </p>
                )}

                {slotsQuery.data && slotsQuery.data.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {slotsQuery.data.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={[
                          "py-2 px-3 rounded-lg text-sm font-medium border transition-colors",
                          selectedTime === slot
                            ? "bg-vero-blue text-white border-vero-blue"
                            : "bg-white text-slate-700 border-slate-200 hover:border-vero-blue hover:text-vero-blue",
                        ].join(" ")}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-vero-blue text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-vero-blue-dark transition-colors"
              >
                Next →
              </button>
            </div>
          </Card>
        )}

        {/* Step 2 — Details */}
        {step === 2 && (
          <Card className="p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Your details</p>
            <form
              onSubmit={form.handleSubmit(() => setStep(3))}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="caller_name">
                  Full Name *
                </label>
                <input
                  id="caller_name"
                  {...form.register("caller_name", { required: true })}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vero-blue focus:border-transparent"
                />
                {form.formState.errors.caller_name && (
                  <p className="text-xs text-red-500">Name is required</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="caller_phone">
                  Phone Number *
                </label>
                <input
                  id="caller_phone"
                  type="tel"
                  {...form.register("caller_phone", { required: true })}
                  placeholder="+44 7700 900000"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vero-blue focus:border-transparent"
                />
                {form.formState.errors.caller_phone && (
                  <p className="text-xs text-red-500">Phone number is required</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700" htmlFor="service_description">
                  What do you need? *
                </label>
                <textarea
                  id="service_description"
                  {...form.register("service_description", { required: true })}
                  placeholder="Briefly describe the service you'd like to book…"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vero-blue focus:border-transparent resize-none"
                />
                {form.formState.errors.service_description && (
                  <p className="text-xs text-red-500">Please describe what you need</p>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-vero-blue text-white text-sm font-semibold hover:bg-vero-blue-dark transition-colors"
                >
                  Next →
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Step 3 — Review & Confirm */}
        {step === 3 && (
          <Card className="p-6 space-y-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirm your booking</p>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Business</span>
                <span className="font-semibold text-slate-800">{businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-800">
                  {format(selectedDate!, "EEEE, d MMMM yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-semibold text-slate-800">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Name</span>
                <span className="font-semibold text-slate-800">{form.getValues("caller_name")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-800">{form.getValues("caller_phone")}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Service</span>
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {form.getValues("service_description")}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">
              We'll send a confirmation SMS to {form.getValues("caller_phone")} once your booking is confirmed.
            </p>

            {confirmMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                Something went wrong — please try again. If the issue persists, call us directly.
              </div>
            )}

            <div className="flex justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={confirmMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                ← Back
              </button>
              <button
                onClick={() => confirmMutation.mutate(form.getValues())}
                disabled={confirmMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-vero-blue text-white text-sm font-semibold hover:bg-vero-blue-dark transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {confirmMutation.isPending && <Spinner className="h-4 w-4 text-white" />}
                {confirmMutation.isPending ? "Confirming…" : "Confirm Booking"}
              </button>
            </div>
          </Card>
        )}

        {/* Step 4 — Success */}
        {step === 4 && bookingResult && (
          <Card className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900">Booking confirmed!</h2>
              <p className="text-sm text-slate-500">
                Your appointment with <strong>{businessName}</strong> on{" "}
                <strong>{format(selectedDate!, "d MMMM yyyy")}</strong> at{" "}
                <strong>{selectedTime}</strong> is confirmed.
              </p>
            </div>
            <p className="text-sm text-slate-500">
              A confirmation SMS has been sent to <strong>{form.getValues("caller_phone")}</strong>.
              You'll also receive a reminder the day before.
            </p>
            <p className="text-xs text-slate-400 pt-2">Powered by V3RO</p>
          </Card>
        )}

      </div>
    </div>
  );
};

export default BookingPage;
