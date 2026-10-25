// 사전 문구 안의 **굵게** 표시를 <strong> 으로 바꿔 줍니다.
export default function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-ink">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}
