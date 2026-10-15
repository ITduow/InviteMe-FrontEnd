import type { ItemProps } from "../components/items";
import { parseStudioDocument } from "../schemas/document";

const asset = "/images/template-studio/story-collection/";
type Section =
  | "letter"
  | "families"
  | "couple"
  | "chapters"
  | "interview"
  | "gallery"
  | "calendar"
  | "countdown"
  | "location"
  | "timeline"
  | "dress"
  | "events"
  | "rsvp"
  | "wishes"
  | "photo-quote";
type StoryRecipe = {
  id: string;
  number: string;
  name: string;
  description: string;
  names: [string, string];
  date: string;
  ink: string;
  accent: string;
  background: string;
  hero: "editorial" | "garden" | "seaside" | "scarlet" | "sage";
  sections: Section[];
};
const recipes: StoryRecipe[] = [
  {
    id: "story-editorial-61",
    number: "61",
    name: "Chuyện mình · Ánh vàng",
    description: "Ảnh phủ, typography lớn và cuộc trò chuyện trước gallery.",
    names: ["Minh Quân", "An Nhiên"],
    date: "2027-05-23",
    ink: "#38352e",
    accent: "#947d4d",
    background: "#f6f0e8",
    hero: "editorial",
    sections: [
      "families",
      "countdown",
      "letter",
      "interview",
      "gallery",
      "calendar",
      "location",
      "rsvp",
      "wishes",
      "photo-quote",
    ],
  },
  {
    id: "story-garden-02",
    number: "2",
    name: "Chuyện mình · Trong vườn",
    description: "Ảnh sân vườn đan giữa lời mời, các chương và câu chữ lớn.",
    names: ["Gia Huy", "Mai Linh"],
    date: "2027-05-20",
    ink: "#35473a",
    accent: "#8d343b",
    background: "#fffdf7",
    hero: "garden",
    sections: [
      "photo-quote",
      "letter",
      "chapters",
      "photo-quote",
      "calendar",
      "countdown",
      "location",
      "rsvp",
      "wishes",
    ],
  },
  {
    id: "story-seaside-01",
    number: "1",
    name: "Chuyện mình · Cùng ra biển",
    description: "Biển xanh, lời mời gần gũi và những khung ảnh du lịch.",
    names: ["Minh Hải", "Thanh An"],
    date: "2027-06-12",
    ink: "#344e58",
    accent: "#607f89",
    background: "#fffefa",
    hero: "seaside",
    sections: [
      "letter",
      "couple",
      "photo-quote",
      "countdown",
      "chapters",
      "gallery",
      "calendar",
      "location",
      "rsvp",
      "wishes",
    ],
  },
  {
    id: "story-scarlet-39",
    number: "39",
    name: "Chuyện mình · Nét son",
    description: "Trắng sáng, chữ đỏ, Save the Date và câu chuyện đôi mình.",
    names: ["Đức Minh", "Bảo Hà"],
    date: "2027-12-15",
    ink: "#493735",
    accent: "#a42a3c",
    background: "#fffefa",
    hero: "scarlet",
    sections: [
      "calendar",
      "couple",
      "chapters",
      "families",
      "location",
      "timeline",
      "rsvp",
      "countdown",
      "wishes",
    ],
  },
  {
    id: "story-sage-53",
    number: "53",
    name: "Chuyện mình · Ngày xanh",
    description: "Giấy kem xanh sage, hai buổi lễ và timeline trước chuyện tình.",
    names: ["Tuấn Anh", "Mai Chi"],
    date: "2027-02-28",
    ink: "#4e5948",
    accent: "#788566",
    background: "#f5f0e3",
    hero: "sage",
    sections: [
      "families",
      "events",
      "timeline",
      "dress",
      "couple",
      "chapters",
      "countdown",
      "gallery",
      "calendar",
      "rsvp",
      "wishes",
    ],
  },
];
type Doc = ReturnType<typeof parseStudioDocument>;
type Kind = Doc["nodes"][string]["type"]["resolvedName"];

function build(recipe: StoryRecipe): Doc {
  const nodes: Doc["nodes"] = {};
  const ids: string[] = [];
  let sequence = 0;
  const src = `${asset}photo-${recipe.number}.webp`;
  const companion = `${asset}photo-${recipe.number}-walk.webp`;
  const add = (kind: Kind, value: ItemProps, label: string) => {
    const id = `${recipe.id}-${++sequence}`;
    ids.push(id);
    nodes[id] = {
      type: { resolvedName: kind },
      isCanvas: false,
      props: value,
      displayName: label,
      parent: "ROOT",
      nodes: [],
      linkedNodes: {},
      hidden: false,
      custom: {},
    };
  };
  const text = (
    value: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize = 22,
    extra: ItemProps = {},
  ) =>
    add(
      "StudioText",
      {
        text: value,
        x,
        y,
        width,
        height,
        fontSize,
        fontFamily: "EB Garamond",
        textAlign: "center",
        lineHeight: 1.35,
        color: recipe.ink,
        ...extra,
      },
      value || "Mảng nền",
    );
  const panel = (
    x: number,
    y: number,
    width: number,
    height: number,
    background: string,
    opacity = 1,
  ) => text("", x, y, width, height, 16, { background, opacity, revealPreset: "none" });
  const photo = (
    source: string,
    x: number,
    y: number,
    width: number,
    height: number,
    extra: ItemProps = {},
  ) =>
    add(
      "StudioImage",
      { src: source, x, y, width, height, objectFit: "cover", ...extra },
      "Ảnh cưới hư cấu",
    );
  const heading = (label: string, y: number, size = 36) =>
    text(label, 30, y, 420, size * 1.5, size, { color: recipe.accent });
  const widget = (kind: Kind, y: number, height: number, extra: ItemProps) =>
    add(
      kind,
      {
        x: 40,
        y,
        width: 400,
        height,
        background: recipe.background,
        color: recipe.ink,
        accent: recipe.accent,
        fontFamily: "EB Garamond",
        ...extra,
      },
      extra.title ?? kind,
    );
  const dateLabel = recipe.date.split("-").reverse().join(" . ");
  const nameLine = `${recipe.names[0]}\n&\n${recipe.names[1]}`;
  let y = 760;
  if (recipe.hero === "editorial") {
    photo(src, 0, 0, 480, 800, { revealPreset: "none" });
    panel(0, 0, 480, 800, "#171713", 0.32);
    text("OUR\nLOVE\nBEGINS", 25, 45, 420, 300, 76, {
      color: "#f1dcaa",
      textAlign: "left",
      lineHeight: 1.05,
    });
    text(nameLine, 35, 540, 410, 145, 35, { color: "#fff9eb" });
    text(dateLabel, 35, 725, 410, 45, 28, { color: "#f1dcaa" });
    y = 875;
  } else if (recipe.hero === "garden") {
    photo(src, 0, 0, 480, 660, { revealPreset: "none" });
    panel(0, 490, 480, 170, "#132d20", 0.42);
    text("Welcome to our wedding", 40, 35, 400, 55, 30, { color: "#ffffff", italic: true });
    text(`${recipe.names[0]}       ${recipe.names[1]}`, 20, 525, 440, 65, 28, { color: "#ffffff" });
    text(dateLabel, 40, 610, 400, 35, 20, { color: "#ffffff" });
    text("WEDDING     /     INVITATION", 20, 680, 440, 40, 22);
  } else if (recipe.hero === "seaside") {
    photo(src, 0, 0, 480, 680, { revealPreset: "none" });
    text("YOU ARE\nMY FAVORITE\nJOURNEY", 25, 25, 430, 200, 49, {
      color: "#fffef4",
      lineHeight: 1.1,
    });
    panel(0, 555, 480, 125, "#244858", 0.45);
    text(`${recipe.names[0]} & ${recipe.names[1]}`, 20, 580, 440, 50, 31, { color: "#ffffff" });
    text(dateLabel, 40, 636, 400, 35, 20, { color: "#ffffff" });
  } else if (recipe.hero === "scarlet") {
    text("Save the Date", 30, 25, 420, 70, 45, { italic: true, color: recipe.accent });
    photo(src, 20, 110, 440, 520, { revealPreset: "none" });
    panel(20, 490, 440, 140, "#ffffff", 0.76);
    text(nameLine, 40, 492, 400, 140, 35, { color: recipe.accent, italic: true });
    text(dateLabel, 40, 655, 400, 50, 32, { color: recipe.accent });
  } else {
    text("LỄ VU QUY", 40, 35, 400, 40, 18);
    text(nameLine, 35, 105, 410, 200, 46, { color: recipe.accent, italic: true });
    text(dateLabel, 40, 310, 400, 40, 24);
    photo(src, 105, 385, 270, 340, { imageShape: "arch", revealPreset: "none" });
    y = 805;
  }
  for (const section of recipe.sections) {
    switch (section) {
      case "letter":
        heading(recipe.hero === "editorial" ? "INVITATION" : "Một lời hẹn dành cho bạn", y, 34);
        text(
          "Ngày vui của chúng mình sẽ trọn vẹn hơn khi có những người thương cùng chung vui. Mời bạn đến, nâng một ly, kể những câu chuyện cũ và cùng tạo thêm kỷ niệm mới.\n\nHẹn gặp bạn trong ngày hạnh phúc ấy!",
          50,
          y + 85,
          380,
          210,
          22,
        );
        y += 365;
        break;
      case "families":
        heading("Hai gia đình · Một ngày vui", y, 29);
        text("NHÀ TRAI\nÔng Nguyễn Văn An\nBà Trần Thu Lan\nHà Nội", 30, y + 85, 195, 140, 19);
        text("NHÀ GÁI\nÔng Lê Thanh Minh\nBà Phạm Ngọc Hoa\nNinh Bình", 255, y + 85, 195, 140, 19);
        y += 285;
        break;
      case "couple":
        heading("Đôi mình", y, 42);
        if (recipe.hero === "seaside" || recipe.hero === "scarlet") {
          photo(`${asset}photo-${recipe.number}-groom.webp`, 30, y + 90, 195, 245);
          photo(`${asset}photo-${recipe.number}-bride.webp`, 255, y + 90, 195, 245);
          text(recipe.names[0], 25, y + 355, 205, 45, 29);
          text(recipe.names[1], 250, y + 355, 205, 45, 29);
        } else {
          photo(companion, 50, y + 90, 380, 285);
          text(`${recipe.names[0]}  &  ${recipe.names[1]}`, 30, y + 400, 420, 45, 29);
        }
        text(
          "Một người thích những chuyến đi, một người thích những buổi sáng chậm rãi. Chúng mình tìm được nhịp chung trong sự quan tâm dành cho nhau.",
          55,
          y + 475,
          370,
          130,
          22,
        );
        y += 665;
        break;
      case "chapters":
        heading(recipe.hero === "garden" ? "OUR LOVE STORY" : "Những chương yêu thương", y, 35);
        photo(src, 25, y + 100, 205, 280, {
          imageShape: recipe.hero === "sage" ? "arch" : "rectangle",
        });
        text(
          "01 / GẶP GỠ\n\nMột buổi chiều bình thường đã trở thành một khởi đầu đáng nhớ. Chúng mình bắt đầu bằng những câu chuyện nhỏ và những lần hẹn cà phê.",
          255,
          y + 120,
          195,
          250,
          20,
          { textAlign: "left" },
        );
        text(
          "02 / CÙNG ĐI TIẾP\n\nQua những ngày nhiều thay đổi, điều ở lại là sự lắng nghe. Hôm nay chúng mình chọn viết tiếp hành trình ấy cùng nhau.",
          30,
          y + 440,
          195,
          250,
          20,
          { textAlign: "left" },
        );
        photo(companion, 250, y + 420, 205, 280, { rotation: recipe.hero === "seaside" ? 3 : 0 });
        y += 775;
        break;
      case "interview":
        widget("StudioInterview", y, 440, {
          title: "Interview · Chuyện đôi mình",
          questions: [
            {
              question: "Khoảnh khắc nào khiến bạn biết đây là người ấy?",
              answer:
                "Không phải một điều quá lớn. Đó là một ngày mệt mỏi nhưng vẫn có người đợi nghe mình kể hết câu chuyện. Từ những quan tâm rất nhỏ, chúng mình thấy tương lai có thể cùng nhau xây dựng.",
            },
            {
              question: "Bạn muốn nói gì với người bạn đời?",
              answer:
                "Cảm ơn vì đã luôn chọn sự dịu dàng. Mong chúng mình giữ được thói quen lắng nghe và tìm niềm vui trong những ngày bình thường.",
            },
            {
              question: "Một lời nhắn cho khách mời?",
              answer:
                "Hãy mang theo nụ cười và những câu chuyện của bạn. Chúng mình rất mong được cùng mọi người tạo thêm một kỷ niệm đẹp.",
            },
          ],
        });
        y += 510;
        break;
      case "gallery":
        widget("StudioAlbum", y, 370, {
          title: recipe.hero === "sage" ? "Kỷ niệm của chúng mình" : "GALLERY",
          images: [src, companion, src, companion],
        });
        y += 445;
        break;
      case "calendar":
        heading("Save the Date", y, 40);
        widget("StudioCalendar", y + 85, 335, {
          title: "Ngày hẹn của chúng mình",
          eventDate: recipe.date,
          eventTime: "18:00",
          timezone: "Asia/Ho_Chi_Minh",
        });
        widget("StudioAction", y + 440, 70, {
          x: 110,
          width: 260,
          title: "Thêm vào lịch",
          action: "calendar",
          eventDate: recipe.date,
          eventTime: "18:00",
          timezone: "Asia/Ho_Chi_Minh",
        });
        y += 575;
        break;
      case "countdown":
        widget("StudioCountdown", y, 185, {
          title: "Chỉ còn…",
          eventDate: recipe.date,
          eventTime: "18:00",
          timezone: "Asia/Ho_Chi_Minh",
        });
        y += 250;
        break;
      case "location":
        heading("Hẹn gặp tại đây", y, 35);
        widget("StudioMap", y + 80, 310, {
          title: "Không gian ngày vui",
          address: "Trung tâm hội nghị · Hà Nội",
        });
        y += 460;
        break;
      case "timeline":
        widget("StudioTimeline", y, 480, {
          title: "Timeline",
          milestones: [
            {
              time: "17:30",
              title: "Đón bạn",
              description: "Check-in và chụp những tấm ảnh đầu tiên.",
            },
            {
              time: "18:00",
              title: "Lời hẹn ước",
              description: "Khoảnh khắc chúng mình chính thức chung một hành trình.",
            },
            {
              time: "18:30",
              title: "Nâng ly",
              description: "Dùng tiệc và cùng nhau sẻ chia niềm vui.",
            },
          ],
        });
        y += 555;
        break;
      case "dress":
        heading("Dresscode", y, 36);
        ["#eee7d8", "#89967a", "#484d43"].forEach((color, index) =>
          text("", 135 + index * 75, y + 75, 50, 50, 16, { background: color, borderRadius: 25 }),
        );
        text("Kem · Sage · Than\nMặc điều khiến bạn cảm thấy thoải mái.", 40, y + 155, 400, 70, 21);
        y += 290;
        break;
      case "events":
        heading("Trân trọng mời bạn", y, 35);
        for (let i = 0; i < 2; i++) {
          const top = y + 80 + i * 375;
          text(i === 0 ? "LỄ VU QUY · 08:00" : "TIỆC THÂN MẬT · 18:00", 40, top, 400, 40, 25);
          text(dateLabel, 40, top + 45, 400, 35, 23);
          widget("StudioMap", top + 100, 225, {
            title: i === 0 ? "Tư gia nhà gái" : "Không gian tiệc cưới",
            address: i === 0 ? "Ninh Bình" : "Trung tâm hội nghị · Hà Nội",
          });
        }
        y += 875;
        break;
      case "rsvp":
        text("Để chúng mình chuẩn bị đón tiếp bạn thật chu đáo.", 50, y, 380, 65, 22);
        widget("StudioAction", y + 90, 85, {
          x: 90,
          width: 300,
          title: "Xác nhận tham dự",
          action: "rsvp",
        });
        widget("StudioAction", y + 200, 75, {
          x: 115,
          width: 250,
          title: "Gửi lời yêu thương",
          action: "gift",
          message: "Sự có mặt của bạn là món quà quý nhất.",
        });
        y += 340;
        break;
      case "wishes":
        widget("StudioWishes", y, 300, { title: "Một lời chúc dành cho đôi mình" });
        y += 375;
        break;
      case "photo-quote":
        photo(companion, 20, y, 440, 330);
        text(
          recipe.hero === "garden" ? "FALL IN LOVE" : "Cùng nhau, mọi ngày đều đáng nhớ.",
          35,
          y + 375,
          410,
          120,
          recipe.hero === "garden" ? 50 : 32,
          { color: recipe.accent, italic: true },
        );
        y += 565;
        break;
    }
  }
  text("Hẹn gặp bạn trong ngày vui\n♡ InviteMe", 40, y + 25, 400, 100, 28, { italic: true });
  nodes.ROOT = {
    type: { resolvedName: "StudioFrame" },
    isCanvas: true,
    props: {
      width: 480,
      height: y + 185,
      background: recipe.background,
      revealPreset: "fade",
      revealDuration: 900,
      cover: {
        enabled: false,
        names: nameLine,
        date: dateLabel,
        background: recipe.accent,
        style: recipe.hero === "sage" || recipe.hero === "garden" ? "botanical" : "floral",
        particles: "none",
        opening: "fade",
      },
    },
    displayName: "Wedding Story",
    custom: {},
    hidden: false,
    nodes: ids,
    linkedNodes: {},
  };
  return parseStudioDocument(JSON.stringify({ schemaVersion: 1, nodes }));
}

export const newStoryTemplates = recipes.map((recipe) => ({
  id: recipe.id,
  name: recipe.name,
  reference: `https://cinelove.me/template/thiep-cuoi-${recipe.number}`,
  description: recipe.description,
  document: build(recipe),
}));
