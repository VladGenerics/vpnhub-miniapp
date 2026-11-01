/* ECharts по модулям: только нужные типы графиков — бандл раздела меньше в 2–3 раза. */
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { DataZoomComponent, GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer])

export { echarts }
export type ECharts = ReturnType<typeof echarts.init>
