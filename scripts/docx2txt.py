"""Word(.docx) 문서의 본문과 표를 텍스트로 뽑습니다. (외부 라이브러리 없이 표준 라이브러리만 사용)

PG 연동 가이드처럼 .docx 로 받은 문서를 읽을 때 씁니다. 표는 `| 칸 | 칸 |` 형태의 줄로 나옵니다.

  python -I scripts/docx2txt.py <문서.docx>            표준 출력으로 내용 출력
  python -I scripts/docx2txt.py <폴더> <출력폴더>       폴더 안의 모든 .docx 를 <출력폴더>/N.txt 로 저장

참고: Windows 터미널에서 한글 경로를 인자로 직접 넘기면 인코딩이 깨질 수 있으므로,
한글 이름 폴더는 위처럼 "폴더"를 넘겨 파이썬이 직접 탐색하게 하는 방식이 안전합니다.
"""
import os
import sys
import zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def para_text(p):
    out = []
    for node in p.iter():
        if node.tag == W + "t":
            out.append(node.text or "")
        elif node.tag == W + "tab":
            out.append("\t")
        elif node.tag == W + "br":
            out.append("\n")
    return "".join(out)


def walk(body):
    lines = []
    for child in body:
        if child.tag == W + "p":
            t = para_text(child).strip()
            if t:
                style = child.find(f"{W}pPr/{W}pStyle")
                sv = style.get(W + "val") if style is not None else ""
                lines.append(("# " if sv and sv.lower().startswith("heading") else "") + t)
        elif child.tag == W + "tbl":
            for tr in child.iter(W + "tr"):
                cells = []
                for tc in tr.findall(W + "tc"):
                    cells.append(" ".join(para_text(p).strip() for p in tc.iter(W + "p") if para_text(p).strip()))
                if any(cells):
                    lines.append("| " + " | ".join(cells) + " |")
            lines.append("")
    return lines


def extract(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    return "\n".join(walk(root.find(W + "body")))


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # 한글 경로·내용을 그대로 출력
    if len(sys.argv) < 2:
        print(__doc__)
        return
    src = sys.argv[1]
    if os.path.isdir(src):
        out_dir = sys.argv[2] if len(sys.argv) > 2 else "docx-text"
        os.makedirs(out_dir, exist_ok=True)
        n = 0
        for dirpath, _, files in os.walk(src):
            for f in sorted(files):
                if f.lower().endswith(".docx"):
                    n += 1
                    target = os.path.join(out_dir, f"{n}.txt")
                    with open(target, "w", encoding="utf-8") as fh:
                        fh.write(extract(os.path.join(dirpath, f)))
                    print(f"{n}: {os.path.join(dirpath, f)} -> {target}")
    else:
        print(extract(src))


if __name__ == "__main__":
    main()
