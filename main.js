import * as THREE from 'three';
// 导入轨道控制器
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import * as d3 from 'd3';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader';
import gsap from 'gsap';
import * as dat from 'dat.gui';
const gui = new dat.GUI();

const scene = new THREE.Scene();

// 角度，宽高比 最近可视距离  最远
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.set(0, 0, 100);
scene.add(camera);

// 渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// 将元素添加至 body
document.body.appendChild(renderer.domElement);
// renderer.render(scene, camera);
// 创建控制器
const controls = new OrbitControls(camera, renderer.domElement);
// 设置阻尼
controls.enableDamping = true;
// 坐标轴辅助器
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// 设置时钟
const clock = new THREE.Clock();

function render() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();

window.addEventListener('resize', () => {
  // 更新摄像头
  camera.aspect = window.innerWidth / window.innerHeight;
  // 更新投影矩阵
  camera.updateProjectionMatrix();
  // 更新渲染器
  renderer.setSize(window.innerWidth, window.innerHeight);
  // 设置渲染器像素比
  renderer.setPixelRatio(window.devicePixelRatio);
});

// 载入geojson文件
// json文件也需要放置到打包后的文件夹中
const loader = new THREE.FileLoader();
loader.load('./assets/FeHelper-20230202100138.json', data => {
  const jsonData = JSON.parse(data);
  // console.log(jsonData);
  operationData(jsonData);
});
const map = new THREE.Object3D(); // 地图集合
function operationData(jsonData) {
  const features = jsonData.features;
  features.forEach(feature => {
    // 创建省份物体
    const province = new THREE.Object3D();
    province.properties = feature.properties.name;
    // 获取经纬度坐标
    const coordinates = feature.geometry.coordinates;
    if (feature.geometry.type === 'Polygon') {
      coordinates.forEach(coordinate => {
        const mesh = createMesh(coordinate);
        mesh.properties = feature.properties.name;
        // 将每个物体添加到省份集合中
        province.add(mesh);
        // 绘制区域边界线
        const line = createLine(coordinate);
        province.add(line);
      });
    }
    // 多多边形
    if (feature.geometry.type === 'MultiPolygon') {
      coordinates.forEach(coordinate => {
        coordinate.forEach(coor => {
          const mesh = createMesh(coor);
          mesh.properties = feature.properties.name;
          province.add(mesh);
          // 绘制区域边界线
          const line = createLine(coor);
          province.add(line);
        });
      });
    }
    map.add(province);
  });
  scene.add(map);
}
// 使用d3将经纬度转为三维坐标
// 设置地图中心,并将该中心移至三维坐标系中心位置
const projection = d3.geoMercator().center([116.5, 38.5]).translate([0, 0, 0]);
function createMesh(polygon) {
  // 使用路径以及可选的孔洞来定义一个二维形状平面。
  const shape = new THREE.Shape();
  polygon.forEach((row, i) => {
    // 将原本经纬度转换为以我们设置的点为中心的位置
    const [longitude, latitude] = projection(row);
    // console.log(row, longitude, latitude);
    if (i === 0) {
      shape.moveTo(longitude, -latitude);
    }
    shape.lineTo(longitude, -latitude);
  });
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: 5});
  const color = new THREE.Color(Math.random() * 0xffffff);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.5
  });
  return new THREE.Mesh(geometry, material);
}
/* ==============点击交互================ */
let lastPicker = null; // 保留上一次选中，用于后面恢复
window.addEventListener('click', ev => {
  const mouse = new THREE.Vector2();
  mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (ev.clientY / window.innerHeight) * -2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  // 获取点击的位置
  const intersects = raycaster.intersectObjects(map.children);
  if (lastPicker) {
    // 恢复颜色
    lastPicker.material.color.copy(lastPicker.material.oldColor);
  }
  if (intersects.length > 0) {
    lastPicker = intersects[0].object;
    // console.log(lastPicker);
    // 记录之前的颜色
    lastPicker.material.oldColor = lastPicker.material.color.clone();
    lastPicker.material.color.set(0xffffff);
  }
});
/* ================根据经纬度画线============= */
function createLine(polygon) {
  const lineGeometry = new THREE.BufferGeometry();
  const pointsArray = [];
  polygon.forEach((row, i) => {
    const [longitude, latitude] = projection(row);
    pointsArray.push(new THREE.Vector3(longitude, -latitude, 5));
  });
  lineGeometry.setFromPoints(pointsArray);
  const color = new THREE.Color(Math.random() * 0xffffff);
  const material = new THREE.LineBasicMaterial({
    color: color
  });
  return new THREE.Line(lineGeometry, material);
}
