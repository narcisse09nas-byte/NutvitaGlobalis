export function CertificateCourse({
  courseName,
  courseSubtitle,
}: {
  courseName: string;
  courseSubtitle: string;
}) {
  return (
    <div className="nvg-course-block">
      <p>has successfully completed the certification</p>
      <h3>{courseName}</h3>
      <em>{courseSubtitle}</em>
    </div>
  );
}