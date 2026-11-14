"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { SiteLayout } from "@/components/layout";
import { Button, Card, EmptyState, ErrorState, Select } from "@/components/kit";
import { DoctorCard, DoctorCardSkeleton } from "@/components/doctor-bits";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDoctors, useHospitals, useNextSlots, useSpecialties } from "@/lib/data";
import { useT } from "@/i18n";
import { dateLK, fmtDate, specName, todayLK } from "@/lib/utils";
import { doctorFiltersSchema, searchSchema } from "@/lib/validation";

const PER_PAGE = 9;
const FILTER_KEYS = ["q", "spec", "district", "hospital", "date"];

export default function DoctorsClient() {
  const { t, lang } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const s = doctorFiltersSchema.parse(Object.fromEntries(["q", "spec", "district", "hospital", "date", "sort", "page"].map((k) => [k, params.get(k) || undefined])));
  const page = s.page;

  const [q, setQ] = useState(s.q ?? "");
  const [drawer, setDrawer] = useState(false);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: undefined, ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const clearAll = () => {
    setQ("");
    router.replace(pathname, { scroll: false });
  };

  const doctors = useDoctors();
  const specialties = useSpecialties();
  const hospitals = useHospitals();
  const next = useNextSlots(s.date);

  const districts = useMemo(() => [...new Set((hospitals.data ?? []).map((h) => h.district))].sort(), [hospitals.data]);
  const hospitalOptions = useMemo(() => (hospitals.data ?? []).filter((h) => !s.district || h.district === s.district), [hospitals.data, s.district]);

  const filtered = useMemo(() => {
    const ql = s.q?.toLowerCase().trim();
    let r = (doctors.data ?? []).filter((d) => {
      const hay = [d.name, d.hospital?.name, d.hospital?.district, d.specialty?.name_en, d.specialty?.name_si, d.specialty?.name_ta].join(" ").toLowerCase();
      return (
        (!ql || hay.includes(ql)) &&
        (!s.spec || d.specialty?.id === s.spec) &&
        (!s.district || d.hospital?.district === s.district) &&
        (!s.hospital || d.hospital?.id === s.hospital)
      );
    });
    if (s.date) r = r.filter((d) => next.data?.[d.id] && dateLK(next.data[d.id]) === s.date);
    if (s.sort === "fee") r = [...r].sort((a, b) => a.fee - b.fee);
    if (s.sort === "next") r = [...r].sort((a, b) => (next.data?.[a.id] ?? "9").localeCompare(next.data?.[b.id] ?? "9"));
    return r;
  }, [doctors.data, next.data, s.q, s.spec, s.district, s.hospital, s.date, s.sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const shown = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const loading = doctors.isLoading || (s.date && next.isLoading);

  const chipLabel = (k) => {
    const v = s[k];
    if (k === "spec") return specName(specialties.data?.find((x) => x.id === v), lang) || v;
    if (k === "hospital") return hospitals.data?.find((x) => x.id === v)?.name ?? v;
    if (k === "date") return fmtDate(v, lang);
    return v;
  };
  const chips = FILTER_KEYS.filter((k) => s[k]).map((k) => ({ k, label: chipLabel(k) }));

  const filters = (
    <div className="space-y-4">
      <div>
        <label htmlFor="f-spec" className="mb-1.5 block text-sm font-semibold">{t("doctors.specialty")}</label>
        <Select id="f-spec" value={s.spec ?? ""} onChange={(e) => set({ spec: e.target.value })}>
          <option value="">{t("doctors.anySpecialty")}</option>
          {(specialties.data ?? []).map((x) => <option key={x.id} value={x.id}>{specName(x, lang)}</option>)}
        </Select>
      </div>
      <div>
        <label htmlFor="f-district" className="mb-1.5 block text-sm font-semibold">{t("doctors.district")}</label>
        <Select id="f-district" value={s.district ?? ""} onChange={(e) => set({ district: e.target.value, hospital: undefined })}>
          <option value="">{t("doctors.anyDistrict")}</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
      </div>
      <div>
        <label htmlFor="f-hospital" className="mb-1.5 block text-sm font-semibold">{t("doctors.hospital")}</label>
        <Select id="f-hospital" value={s.hospital ?? ""} onChange={(e) => set({ hospital: e.target.value })}>
          <option value="">{t("doctors.anyHospital")}</option>
          {hospitalOptions.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </Select>
      </div>
      <div>
        <label htmlFor="f-date" className="mb-1.5 block text-sm font-semibold">{t("doctors.date")}</label>
        <input id="f-date" type="date" min={todayLK()} className="h-12 w-full rounded-lg border border-input bg-card px-3" value={s.date ?? ""} onChange={(e) => set({ date: e.target.value })} />
      </div>
      <Button variant="outline" className="w-full" onClick={clearAll}>{t("doctors.clearAll")}</Button>
    </div>
  );

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">{t("doctors.title")}</h1>
        <form
          role="search"
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: searchSchema.catch("").parse(q) });
          }}
        >
          <label htmlFor="dq" className="sr-only">{t("home.searchPlaceholder")}</label>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input id="dq" type="search" maxLength={100} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("home.searchPlaceholder")} className="h-12 w-full rounded-lg border border-input bg-card pl-11 pr-3" />
          </div>
          <Button type="submit">{t("common.search")}</Button>
          <Button type="button" variant="outline" className="lg:hidden" onClick={() => setDrawer(true)} aria-label={t("doctors.openFilters")}>
            <SlidersHorizontal className="size-5" aria-hidden />
          </Button>
        </form>

        <div className="flex gap-6">
          <aside aria-label={t("doctors.filters")} className="hidden w-72 shrink-0 lg:block">
            <Card className="sticky top-20 p-5">
              <h2 className="mb-4 font-bold">{t("doctors.filters")}</h2>
              {filters}
            </Card>
          </aside>
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <p aria-live="polite" className="mr-auto font-semibold">
                {loading ? t("common.loading") : t("doctors.results", { count: filtered.length })}
              </p>
              <label htmlFor="sort" className="text-sm text-muted-foreground">{t("doctors.sort")}</label>
              <select id="sort" className="h-10 rounded-lg border border-input bg-card px-2 text-sm" value={s.sort ?? "relevance"} onChange={(e) => set({ sort: e.target.value === "relevance" ? undefined : e.target.value })}>
                <option value="relevance">{t("doctors.sortRelevance")}</option>
                <option value="next">{t("doctors.sortNext")}</option>
                <option value="fee">{t("doctors.sortFee")}</option>
              </select>
            </div>
            {chips.length > 0 && (
              <ul className="mb-4 flex flex-wrap gap-2" aria-label={t("doctors.activeFilters")}>
                {chips.map((c) => (
                  <li key={c.k}>
                    <button
                      type="button"
                      onClick={() => {
                        if (c.k === "q") setQ("");
                        set({ [c.k]: undefined });
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground"
                      aria-label={t("doctors.removeFilter", { label: c.label })}
                    >
                      {c.label}
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={clearAll} className="px-2 py-1 text-sm font-semibold text-primary underline">{t("doctors.clearAll")}</button>
                </li>
              </ul>
            )}

            {loading && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <DoctorCardSkeleton key={i} />)}
              </div>
            )}
            {!loading && doctors.isError && <ErrorState message={t("doctors.errorLoad")} onRetry={() => doctors.refetch()} retryLabel={t("common.tryAgain")} />}
            {!loading && !doctors.isError && shown.length === 0 && (
              <EmptyState icon={<SearchX className="size-10" />} title={t("doctors.emptyTitle")}>
                <p className="text-sm text-muted-foreground">{t("doctors.emptyText")}</p>
                <Button variant="outline" onClick={clearAll}>{t("doctors.resetFilters")}</Button>
              </EmptyState>
            )}
            {!loading && shown.length > 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {shown.map((d) => <DoctorCard key={d.id} d={d} nextSlot={next.isLoading ? undefined : (next.data?.[d.id] ?? null)} />)}
                </div>
                {pages > 1 && (
                  <nav aria-label={t("common.pageOf", { page, pages })} className="mt-6 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })} aria-label={t("common.prevPage")}>
                      <ChevronLeft className="size-4" aria-hidden />
                    </Button>
                    <span className="text-sm">{t("common.pageOf", { page, pages })}</span>
                    <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })} aria-label={t("common.nextPage")}>
                      <ChevronRight className="size-4" aria-hidden />
                    </Button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={drawer} onOpenChange={setDrawer}>
        <DialogContent closeLabel={t("doctors.closeFilters")} className="top-auto bottom-0 translate-y-0 rounded-b-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("doctors.filters")}</DialogTitle>
          </DialogHeader>
          {filters}
          <Button className="w-full" onClick={() => setDrawer(false)}>
            {t("doctors.showResults")} ({filtered.length})
          </Button>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
