export function ContactScreen() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--background)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
            Contact
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            Not launched yet, but fully reachable.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-[1.65] text-[var(--muted-foreground)] sm:mt-4 sm:text-base sm:leading-[1.7]">
            Even before the official launch, we are open to conversations on partnerships, housing
            interest, hiring, and investment. Reach out via the channels below and our Operations
            Manager in New York will review first.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-8 sm:pb-20 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_0.9fr] lg:gap-12">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 text-sm text-[var(--muted-foreground)] sm:grid-cols-2 sm:gap-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  US Office
                </p>
                <p className="mt-1.5 text-[var(--foreground)] sm:mt-2">
                  45 Rockefeller Plaza, Fl 20
                  <br />
                  New York, NY 10111
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Contact
                </p>
                <p className="mt-1.5 text-[var(--foreground)] sm:mt-2">Email: info@misaeng.com</p>
                <p className="mt-0.5 text-[var(--foreground)]">Kakao: misaeng_us</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#F64310]/20 bg-[#F64310]/5 p-3.5 text-sm sm:p-4">
              <p className="font-semibold text-[var(--foreground)]">Before we launch</p>
              <p className="mt-1 leading-relaxed text-[var(--muted-foreground)] sm:mt-1.5">
                This website is a beta version for market research. No contracts, payments, or
                legally-binding agreements are executed online. All communication is for information
                and consultation purposes only.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Leave a message (Beta)</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)] sm:mt-1.5">
              This form is a UX prototype only. Actual message delivery will be enabled after the
              official launch.
            </p>
            <form className="mt-4 space-y-3 text-sm sm:mt-5">
              <div className="space-y-1">
                <label htmlFor="name" className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  disabled
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] disabled:cursor-not-allowed sm:text-sm"
                  placeholder="Available after official launch"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="email" className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  disabled
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] disabled:cursor-not-allowed sm:text-sm"
                  placeholder="Available after official launch"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="message" className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  disabled
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] disabled:cursor-not-allowed sm:text-sm"
                  placeholder="This is a beta version for market research purposes only."
                />
              </div>
              <button
                type="button"
                disabled
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-medium text-[var(--muted)] disabled:cursor-not-allowed"
              >
                Available after official launch
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
