interface MaterialDetail {
  material_id: string;
  post_url: string;
  play_url: string;
  show_cnt: string;
  play_over_cnt: string;
  convert_cnt: string;
  show_ratio: number;
  play_over_ratio: number;
  convert_rate: number;
}

enum MaterialIndexType {
  SHOW = 1,
  VV_FINISH = 2,
  CONVERT = 3
}

enum EntryAnimation {
  LEFT = 'left',
  RIGHT = 'right',
  UP = 'up',
  DOWN = 'down'
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GradeListItem {
  grade: string;
  height: number;
  labelColor: string;
  list: MaterialDetail[];
  margin: number;
  width: number;
}

enum MaterialType {
  VIDEO = 3,
  PICTURE = 2
}


export  { MaterialDetail, MaterialIndexType, EntryAnimation, Rect, GradeListItem, MaterialType  }
