import type { LegalSection } from "@/lib/i18n/legal";

export default function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <>
      {sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
          {s.table && (
            <table>
              <thead>
                <tr>
                  {s.table.head.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.table.rows.map((row) => (
                  <tr key={row.join("|")}>
                    {row.map((cell, i) => (
                      <td key={i}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {s.list && (
            <ul>
              {s.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {s.after?.map((p) => (
            <p key={p} className="mt-3">
              {p}
            </p>
          ))}
        </section>
      ))}
    </>
  );
}
